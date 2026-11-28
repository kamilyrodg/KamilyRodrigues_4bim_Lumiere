const apiBase = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
) && window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';
const API = `${apiBase}/api/gerente/funcionarios`;

const formulario = document.getElementById('form-funcionario');
const painelFormulario = document.getElementById('painel-formulario');
const corpoTabela = document.getElementById('lista-funcionarios');
const mensagem = document.getElementById('mensagem');
const totalRegistros = document.getElementById('total-registros');
const campoAtivo = document.getElementById('campo-ativo');
let funcionarios = [];

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
    totalRegistros.textContent = `${funcionarios.length} ${funcionarios.length === 1 ? 'cadastro' : 'cadastros'}`;
    if (!funcionarios.length) {
        corpoTabela.innerHTML = '<tr><td class="crud-vazio" colspan="7">Nenhum funcionário cadastrado.</td></tr>';
        return;
    }
    corpoTabela.innerHTML = funcionarios.map(funcionario => `
        <tr class="${funcionario.ativo ? '' : 'linha-inativa'}">
            <td>${escaparHTML(funcionario.nome)}</td>
            <td>${escaparHTML(funcionario.cargo)}</td>
            <td>${escaparHTML(funcionario.email)}</td>
            <td>${escaparHTML(funcionario.telefone || '—')}</td>
            <td>${formatarData(funcionario.data_cadastro)}</td>
            <td><span class="status-cadastro ${funcionario.ativo ? '' : 'inativo'}">${funcionario.ativo ? 'Ativo' : 'Inativo'}</span></td>
            <td><div class="acoes-cadastro">
                <button class="crud-button pequeno" type="button" data-editar="${funcionario.id}">Editar</button>
                ${funcionario.ativo
                    ? `<button class="crud-button pequeno perigo" type="button" data-excluir="${funcionario.id}">Desativar</button>`
                    : `<button class="crud-button pequeno" type="button" data-reativar="${funcionario.id}">Reativar</button>`}
            </div></td>
        </tr>
    `).join('');
}

async function carregarFuncionarios() {
    try {
        const dados = await requisitar();
        funcionarios = dados.funcionarios || [];
        desenharTabela();
        mostrarMensagem('');
    } catch (erro) {
        totalRegistros.textContent = 'Falha ao carregar';
        corpoTabela.innerHTML = '<tr><td class="crud-vazio" colspan="7">Não foi possível carregar os funcionários.</td></tr>';
        mostrarMensagem(erro.message, true);
    }
}

function abrirFormulario(funcionario = null) {
    formulario.reset();
    formulario.elements.id.value = funcionario?.id || '';
    formulario.elements.nome.value = funcionario?.nome || '';
    formulario.elements.email.value = funcionario?.email || '';
    formulario.elements.cargo.value = funcionario?.cargo || '';
    formulario.elements.telefone.value = funcionario?.telefone || '';
    formulario.elements.ativo.checked = funcionario ? Boolean(funcionario.ativo) : true;
    document.getElementById('titulo-formulario').textContent = funcionario ? 'Editar funcionário' : 'Novo funcionário';
    campoAtivo.hidden = !funcionario;
    painelFormulario.hidden = false;
    painelFormulario.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (!funcionario) formulario.elements.nome.focus();
}

document.getElementById('novo-funcionario').addEventListener('click', () => abrirFormulario());
document.getElementById('cancelar-formulario').addEventListener('click', () => {
    painelFormulario.hidden = true;
    formulario.reset();
});

formulario.addEventListener('submit', async evento => {
    evento.preventDefault();
    const id = formulario.elements.id.value;
    const dados = Object.fromEntries(new FormData(formulario).entries());
    dados.ativo = formulario.elements.ativo.checked;
    try {
        await requisitar(id ? `${API}/${id}` : API, {
            method: id ? 'PUT' : 'POST',
            body: JSON.stringify(dados)
        });
        painelFormulario.hidden = true;
        formulario.reset();
        mostrarMensagem(id ? 'Funcionário atualizado.' : 'Funcionário cadastrado.');
        await carregarFuncionarios();
    } catch (erro) { mostrarMensagem(erro.message, true); }
});

corpoTabela.addEventListener('click', async evento => {
    const botao = evento.target.closest('button');
    if (!botao) return;
    const funcionario = funcionarios.find(item => item.id === Number(botao.dataset.editar || botao.dataset.excluir || botao.dataset.reativar));
    if (botao.dataset.editar) return abrirFormulario(funcionario);

    if (botao.dataset.excluir) {
        if (!window.confirm(`Desativar ${funcionario?.nome || 'este funcionário'}?`)) return;
        try {
            await requisitar(`${API}/${funcionario.id}`, { method: 'DELETE' });
            mostrarMensagem('Funcionário desativado.');
            await carregarFuncionarios();
        } catch (erro) { mostrarMensagem(erro.message, true); }
    }

    if (botao.dataset.reativar) {
        try {
            await requisitar(`${API}/${funcionario.id}/status`, {
                method: 'PATCH', body: JSON.stringify({ ativo: true })
            });
            mostrarMensagem('Funcionário reativado.');
            await carregarFuncionarios();
        } catch (erro) { mostrarMensagem(erro.message, true); }
    }
});

carregarFuncionarios();
