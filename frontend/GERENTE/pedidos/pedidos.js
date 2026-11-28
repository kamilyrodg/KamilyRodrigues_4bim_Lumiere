const apiBase = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
) && window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';
const API = `${apiBase}/api/gerente/pedidos`;
const corpoTabela = document.getElementById('lista-pedidos');
const totalPedidos = document.getElementById('total-pedidos');
const mensagem = document.getElementById('mensagem');
const statusPedido = {
    recebido: 'Recebido',
    confirmado: 'Confirmado',
    em_preparacao: 'Em preparação',
    enviado: 'Enviado',
    cancelado: 'Cancelado'
};

function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[caractere]);
}

function formatarData(valor) {
    if (!valor) return '—';
    return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
        throw new Error('Entre com uma conta de gerente para ver os pedidos.');
    }
    const dados = resposta.status === 204 ? {} : await resposta.json();
    if (!resposta.ok) throw new Error(dados.erro || 'Não foi possível carregar os pedidos.');
    return dados;
}

function desenharPedidos(pedidos) {
    totalPedidos.textContent = `${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'} (máximo de 300 recentes)`;
    if (!pedidos.length) {
        corpoTabela.innerHTML = '<tr><td class="crud-vazio" colspan="7">Ainda não há pedidos cadastrados.</td></tr>';
        return;
    }

    corpoTabela.innerHTML = pedidos.map(pedido => {
        const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
        const descricaoItens = itens.length
            ? itens.map(item => `${escaparHTML(item.quantidade)}× ${escaparHTML(item.nome)}`).join('<br>')
            : 'Sem itens detalhados';
        const opcoesStatus = Object.entries(statusPedido).map(([valor, rotulo]) =>
            `<option value="${valor}" ${pedido.status_pedido === valor ? 'selected' : ''}>${rotulo}</option>`
        ).join('');

        return `
            <tr data-pedido="${escaparHTML(pedido.id)}">
                <td>#${escaparHTML(pedido.id)}</td>
                <td>${escaparHTML(pedido.nome_cliente || 'Cliente')}<span class="dados-secundarios">${escaparHTML(pedido.email_cliente || '')}</span></td>
                <td class="itens-pedido">${descricaoItens}</td>
                <td>${formatarData(pedido.data_pedido)}</td>
                <td>${formatarMoeda(pedido.valor_total)}</td>
                <td>${escaparHTML(pedido.forma_pagamento || '—')}<span class="dados-secundarios">${escaparHTML(pedido.status_pagamento || '')}</span></td>
                <td><span class="status-select-wrap" data-status="${escaparHTML(pedido.status_pedido)}">
                    <select class="status-select" aria-label="Status do pedido ${escaparHTML(pedido.id)}" data-status-anterior="${escaparHTML(pedido.status_pedido)}">
                        ${opcoesStatus}
                    </select>
                </span></td>
            </tr>
        `;
    }).join('');
}

async function carregarPedidos() {
    try {
        const dados = await requisitar(API);
        desenharPedidos(dados.pedidos || []);
        mensagem.textContent = '';
        mensagem.classList.remove('erro');
    } catch (erro) {
        totalPedidos.textContent = 'Não foi possível conectar';
        corpoTabela.innerHTML = '<tr><td class="crud-vazio" colspan="7">Não foi possível carregar os pedidos.</td></tr>';
        mensagem.textContent = erro.message;
        mensagem.classList.add('erro');
    }
}

corpoTabela.addEventListener('change', async evento => {
    const seletor = evento.target.closest('.status-select');
    if (!seletor) return;
    const linha = seletor.closest('[data-pedido]');
    const moldura = seletor.closest('.status-select-wrap');
    const statusAnterior = seletor.dataset.statusAnterior;
    seletor.disabled = true;
    try {
        await requisitar(`${API}/${encodeURIComponent(linha.dataset.pedido)}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status_pedido: seletor.value })
        });
        seletor.dataset.statusAnterior = seletor.value;
        moldura.dataset.status = seletor.value;
        mensagem.textContent = `Pedido #${linha.dataset.pedido} atualizado.`;
        mensagem.classList.remove('erro');
    } catch (erro) {
        seletor.value = statusAnterior;
        mensagem.textContent = erro.message;
        mensagem.classList.add('erro');
    } finally {
        seletor.disabled = false;
    }
});

carregarPedidos();
