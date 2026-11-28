const apiBase = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
) && window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';
const API = `${apiBase}/api/gerente/solicitacoes-servico`;
const corpoSolicitacoes = document.getElementById('lista-solicitacoes');
const totalSolicitacoes = document.getElementById('total-solicitacoes');
const mensagemSolicitacoes = document.getElementById('mensagem-solicitacoes');

const tiposServico = {
    manutencao: 'Manutenção',
    revelacao: 'Revelação',
    digitalizacao: 'Digitalização'
};

const statusServico = {
    solicitado: 'Solicitado',
    em_atendimento: 'Em atendimento',
    concluido: 'Concluído',
    cancelado: 'Cancelado'
};

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[caractere]);
}

function formatarData(valor) {
    if (!valor) return '—';
    return new Date(valor).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
}

async function requisitar(url, opcoes = {}) {
    const resposta = await fetch(url, {
        credentials: 'include',
        ...opcoes,
        headers: {
            ...(opcoes.body ? { 'Content-Type': 'application/json' } : {}),
            ...(opcoes.headers || {})
        }
    });

    if (resposta.status === 401 || resposta.status === 403) {
        window.location.href = '../../CLIENTE/login/login.html';
        throw new Error('Entre com uma conta de gerente para ver as solicitações.');
    }

    const dados = await resposta.json();
    if (!resposta.ok) {
        throw new Error(dados.erro || 'Não foi possível carregar as solicitações.');
    }
    return dados;
}

function desenharSolicitacoes(solicitacoes) {
    totalSolicitacoes.textContent = `${solicitacoes.length} ${solicitacoes.length === 1 ? 'solicitação' : 'solicitações'}`;

    if (!solicitacoes.length) {
        corpoSolicitacoes.innerHTML = '<tr><td class="crud-vazio" colspan="6">Ainda não há solicitações de serviços.</td></tr>';
        return;
    }

    corpoSolicitacoes.innerHTML = solicitacoes.map(item => {
        const opcoesStatus = Object.entries(statusServico).map(([valor, rotulo]) =>
            `<option value="${valor}" ${item.status === valor ? 'selected' : ''}>${rotulo}</option>`
        ).join('');

        return `
            <tr data-solicitacao="${escaparHTML(item.id)}">
                <td>#${escaparHTML(item.id)}</td>
                <td>${escaparHTML(tiposServico[item.tipo_servico] || item.tipo_servico)}</td>
                <td>${escaparHTML(item.servico_escolhido)}</td>
                <td>${escaparHTML(item.nome_cliente || item.username || 'Cliente')}<span class="dados-secundarios">${escaparHTML(item.email_cliente || '')}</span></td>
                <td>${formatarData(item.criada_em)}</td>
                <td>
                    <span class="status-select-wrap" data-status="${escaparHTML(item.status)}">
                        <select class="status-select" aria-label="Status da solicitação ${escaparHTML(item.id)}" data-status-anterior="${escaparHTML(item.status)}">
                            ${opcoesStatus}
                        </select>
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

async function carregarSolicitacoes() {
    try {
        const dados = await requisitar(API);
        desenharSolicitacoes(dados.solicitacoes || []);
        mensagemSolicitacoes.textContent = '';
        mensagemSolicitacoes.classList.remove('erro');
    } catch (erro) {
        totalSolicitacoes.textContent = 'Não foi possível conectar';
        corpoSolicitacoes.innerHTML = '<tr><td class="crud-vazio" colspan="6">Não foi possível carregar as solicitações.</td></tr>';
        mensagemSolicitacoes.textContent = erro.message;
        mensagemSolicitacoes.classList.add('erro');
    }
}

corpoSolicitacoes.addEventListener('change', async evento => {
    const seletor = evento.target.closest('.status-select');
    if (!seletor) return;

    const linha = seletor.closest('[data-solicitacao]');
    const moldura = seletor.closest('.status-select-wrap');
    const statusAnterior = seletor.dataset.statusAnterior;
    seletor.disabled = true;

    try {
        await requisitar(`${API}/${encodeURIComponent(linha.dataset.solicitacao)}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: seletor.value })
        });
        seletor.dataset.statusAnterior = seletor.value;
        moldura.dataset.status = seletor.value;
        mensagemSolicitacoes.textContent = `Solicitação #${linha.dataset.solicitacao} atualizada.`;
        mensagemSolicitacoes.classList.remove('erro');
    } catch (erro) {
        seletor.value = statusAnterior;
        mensagemSolicitacoes.textContent = erro.message;
        mensagemSolicitacoes.classList.add('erro');
    } finally {
        seletor.disabled = false;
    }
});

carregarSolicitacoes();
