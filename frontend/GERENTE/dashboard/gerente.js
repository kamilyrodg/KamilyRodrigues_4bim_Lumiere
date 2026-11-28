
const apiBase = (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
) && window.location.port !== '3000'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : '';
const API = `${apiBase}/api/gerente`;

// Elementos do dashboard
const tabelaPedidos = document.querySelector(
    '.tabela-pedidos tbody'
);

const tabelaServicos = document.querySelector(
    '.tabela-servicos tbody'
);

// Evitar inserção de HTML indevido
function escaparHTML(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[caractere]);
}

// Formatar data
function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatarMoeda(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero)
        ? numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '—';
}

// Traduzir os status de pagamento
function formatarStatus(status) {
    const statusMapeados = {
        aguardando_pagamento: {
            texto: 'Aguardando pagamento',
            classe: 'aguardando'
        },

        pago: {
            texto: 'Pagamento confirmado',
            classe: 'confirmado'
        },

        aprovado: {
            texto: 'Pagamento aprovado',
            classe: 'confirmado'
        },

        cancelado: {
            texto: 'Cancelado',
            classe: 'entregue'
        },

        recusado: {
            texto: 'Pagamento recusado',
            classe: 'entregue'
        },

        estornado: {
            texto: 'Estornado',
            classe: 'entregue'
        }
    };

    return statusMapeados[status] || {
        texto: status || 'Não informado',
        classe: 'preparacao'
    };
}

function formatarStatusPedido(status) {
    const statusMapeados = {
        recebido: { texto: 'Recebido', classe: 'pedido-recebido' },
        confirmado: { texto: 'Confirmado', classe: 'pedido-confirmado' },
        em_preparacao: { texto: 'Em preparação', classe: 'pedido-preparacao' },
        enviado: { texto: 'Enviado', classe: 'pedido-enviado' },
        cancelado: { texto: 'Cancelado', classe: 'pedido-cancelado' }
    };

    return statusMapeados[status] || {
        texto: status || 'Não informado',
        classe: 'pedido-recebido'
    };
}

// Carregar pedidos
function mostrarPedidos(pedidos) {
    if (pedidos.length === 0) {
        tabelaPedidos.innerHTML = `
            <tr>
                <td colspan="5">Nenhum pedido recebido ainda.</td>
            </tr>
        `;
        return;
    }

    tabelaPedidos.innerHTML = pedidos.map(pedido => {
        const statusPedido = formatarStatusPedido(pedido.status_pedido);

        return `
            <tr>
                <td>#${escaparHTML(pedido.id)}</td>

                <td>${formatarData(pedido.data_pedido)}</td>

                <td>${escaparHTML(pedido.nome_cliente || pedido.username || 'Cliente')}</td>

                <td>${escaparHTML(formatarMoeda(pedido.valor_total))}</td>

                <td>
                    <span class="status ${statusPedido.classe}">
                        ${escaparHTML(statusPedido.texto)}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Carregar serviços
function mostrarServicos(servicos) {
    if (servicos.length === 0) {
        tabelaServicos.innerHTML = `
            <tr>
                <td colspan="3">Nenhum serviço solicitado ainda.</td>
            </tr>
        `;
        return;
    }

    tabelaServicos.innerHTML = servicos.map(servico => {
        const ehSolicitacao = servico.origem === 'whatsapp';
        const statusSolicitacao = {
            solicitado: { texto: 'Solicitado', classe: 'preparacao' },
            em_atendimento: { texto: 'Em atendimento', classe: 'confirmado' },
            concluido: { texto: 'Concluído', classe: 'entregue' },
            cancelado: { texto: 'Cancelado', classe: 'entregue' }
        };
        const status = ehSolicitacao
            ? (statusSolicitacao[servico.status_solicitacao] || {
                texto: servico.status_solicitacao || 'Solicitado',
                classe: 'preparacao'
            })
            : formatarStatus(servico.status_pagamento);

        return `
            <tr>
                <td>#${escaparHTML(servico.item_id)}</td>

                <td>
                    ${escaparHTML(servico.nome_servico)}
                </td>

                <td>
                    <span class="status ${status.classe}">
                        ${escaparHTML(status.texto)}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// Buscar dados do banco através da API
async function carregarDashboard() {
    try {
        const resposta = await fetch(`${API}/dashboard`, {
            method: 'GET',
            credentials: 'include'
        });

        if (resposta.status === 401) {
            window.location.href = '../../CLIENTE/login/login.html';
            return;
        }

        if (resposta.status === 403) {
            alert('Você não tem permissão para acessar o painel.');
            window.location.href = '../../../index.html';
            return;
        }

        if (!resposta.ok) {
            throw new Error('Erro ao carregar os dados.');
        }

        const dados = await resposta.json();

        // Atualizar tabelas
        mostrarPedidos(dados.pedidos);
        mostrarServicos(dados.servicos);

    } catch (erro) {
        console.error('Erro no dashboard:', erro);

        tabelaPedidos.innerHTML = `
            <tr>
                <td colspan="5">Não foi possível carregar os pedidos.</td>
            </tr>
        `;

        tabelaServicos.innerHTML = `
            <tr>
                <td colspan="3">Não foi possível carregar os serviços.</td>
            </tr>
        `;
    }
}

// Inicializar dashboard
carregarDashboard();
