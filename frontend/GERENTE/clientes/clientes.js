const apiBase = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
) && window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';
const API = `${apiBase}/api/gerente/clientes`;

const formulario = document.getElementById('form-cliente');
const painelFormulario = document.getElementById('painel-formulario');
const corpoTabela = document.getElementById('lista-clientes');
const mensagem = document.getElementById('mensagem');
const totalRegistros = document.getElementById('total-registros');
const campoSenha = document.getElementById('campo-senha');
const campoAtivo = document.getElementById('campo-ativo');
let clientes = [];

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[caractere]);
}

function mostrarMensagem(texto, erro = false) {
    mensagem.textContent = texto;
    mensagem.classList.toggle('erro', erro);
}

async function requisitar(url = API, opcoes = {}) {
    const resposta = await fetch(url, {
        credentials: 'include',
        ...opcoes,
        headers: { ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}), ...(opcoes.headers || {}) }
    });
    if (resposta.status === 401 || resposta.status === 403) {
        window.location.href = '../../CLIENTE/login/login.html';
        throw new Error('Sua sessão de gerente expirou. Entre novamente.');
    }
    const dados = resposta.status === 204 ? {} : await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível concluir a operação.');
    return dados;
}

function formatarData(data) {
    if (!data) return '—';
    const valor = String(data).slice(0, 10);
    const [ano, mes, dia] = valor.split('-');
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

function desenharTabela() {
    totalRegistros.textContent = `${clientes.length} ${clientes.length === 1 ? 'cadastro' : 'cadastros'}`;
    if (!clientes.length) {
        corpoTabela.innerHTML = '<tr><td class="crud-vazio" colspan="7">Nenhum cliente cadastrado.</td></tr>';
        return;
    }

    corpoTabela.innerHTML = clientes.map(cliente => `
        <tr class="${cliente.ativo ? '' : 'linha-inativa'}">
            <td>${escaparHTML(cliente.nome)}</td>
            <td>${escaparHTML(cliente.email)}</td>
            <td>${escaparHTML(cliente.username)}</td>
            <td>${escaparHTML(cliente.telefone || '—')}</td>
            <td>${formatarData(cliente.data_cadastro)}</td>
            <td><span class="status-cadastro ${cliente.ativo ? '' : 'inativo'}">${cliente.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td><div class="acoes-cadastro">
                <button class="crud-button pequeno" type="button" data-editar="${cliente.id}">Editar</button>
                ${cliente.ativo
                    ? `<button class="crud-button pequeno perigo" type="button" data-excluir="${cliente.id}">Desativar</button>`
                    : `<button class="crud-button pequeno" type="button" data-reativar="${cliente.id}">Reativar</button>`}
            </div></td>
        </tr>
    `).join('');
}

async function carregarClientes() {
    try {
        const dados = await requisitar();
        clientes = dados.clientes || [];
        desenharTabela();
        mostrarMensagem('');
    } catch (erro) {
        totalRegistros.textContent = 'Falha ao carregar';
        corpoTabela.innerHTML = '<tr><td class="crud-vazio" colspan="7">Não foi possível carregar os clientes.</td></tr>';
        mostrarMensagem(erro.message, true);
    }
}

function abrirFormulario(cliente = null) {
    formulario.reset();
    formulario.elements.id.value = cliente?.id || '';
    formulario.elements.nome.value = cliente?.nome || '';
    formulario.elements.email.value = cliente?.email || '';
    formulario.elements.username.value = cliente?.username || '';
    formulario.elements.telefone.value = cliente?.telefone || '';
    formulario.elements.senha.value = '';
    formulario.elements.ativo.checked = cliente ? Boolean(cliente.ativo) : true;
    document.getElementById('titulo-formulario').textContent = cliente ? 'Editar cliente' : 'Novo cliente';
    campoSenha.hidden = Boolean(cliente);
    formulario.elements.senha.required = !cliente;
    formulario.elements.senha.placeholder = cliente ? 'Deixe em branco para manter a senha atual' : 'Mínimo de 8 caracteres';
    campoAtivo.hidden = !cliente;
    painelFormulario.hidden = false;
    painelFormulario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (!cliente) formulario.elements.nome.focus();
}

document.getElementById('novo-cliente').addEventListener('click', () => abrirFormulario());
document.getElementById('cancelar-formulario').addEventListener('click', () => {
    painelFormulario.hidden = true;
    formulario.reset();
});

formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    const id = formulario.elements.id.value;
    const dados = Object.fromEntries(new FormData(formulario).entries());
    dados.ativo = formulario.elements.ativo.checked;
    if (!dados.senha) delete dados.senha;
    try {
        await requisitar(id ? `${API}/${id}` : API, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(dados)
        });
        painelFormulario.hidden = true;
        formulario.reset();
        mostrarMensagem(id ? 'Cliente atualizado.' : 'Cliente cadastrado.');
        await carregarClientes();
    } catch (erro) {
        mostrarMensagem(erro.message, true);
    }
});

corpoTabela.addEventListener('click', async evento => {
    const botao = evento.target.closest('button');
    if (!botao) return;
    const cliente = clientes.find(item => item.id === Number(botao.dataset.editar || botao.dataset.excluir || botao.dataset.reativar));
    if (botao.dataset.editar) return abrirFormulario(cliente);

    if (botao.dataset.excluir) {
        if (!window.confirm(`Desativar ${cliente?.nome || 'este cliente'}? O histórico de pedidos será preservado.`)) return;
        try {
            await requisitar(`${API}/${cliente.id}`, { method: 'DELETE' });
            mostrarMensagem('Cliente desativado. O histórico foi preservado.');
            await carregarClientes();
        } catch (erro) { mostrarMensagem(erro.message, true); }
    }

    if (botao.dataset.reativar) {
        try {
            await requisitar(`${API}/${cliente.id}/status`, {
                method: 'PATCH', body: JSON.stringify({ ativo: true })
            });
            mostrarMensagem('Cliente reativado.');
            await carregarClientes();
        } catch (erro) { mostrarMensagem(erro.message, true); }
    }
});

carregarClientes();
