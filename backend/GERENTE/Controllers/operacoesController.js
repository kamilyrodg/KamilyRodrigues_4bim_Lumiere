const pool = require('../../db');

const STATUS_PEDIDO = new Set([
    'recebido',
    'confirmado',
    'em_preparacao',
    'enviado',
    'cancelado'
]);

const STATUS_SOLICITACAO_SERVICO = new Set([
    'solicitado',
    'em_atendimento',
    'concluido',
    'cancelado'
]);

function idValido(valor) {
    const id = Number.parseInt(valor, 10);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function listarPedidos(req, res) {
    try {
        const resultado = await pool.query(`
            SELECT
                p.id,
                p.data_pedido,
                p.valor_total,
                p.status_pedido,
                p.status_pagamento,
                u.nome AS nome_cliente,
                u.email AS email_cliente,
                fp.nome AS forma_pagamento,
                e.nome_endereco,
                e.endereco,
                COALESCE((
                    SELECT json_agg(
                        json_build_object(
                            'nome', ip.nome_item,
                            'quantidade', ip.quantidade,
                            'preco_unitario', ip.preco_unitario
                        ) ORDER BY ip.id
                    )
                    FROM itens_pedido ip
                    WHERE ip.pedido_id = p.id
                ), '[]'::json) AS itens
            FROM pedidos p
            INNER JOIN usuarios u ON u.id = p.usuario_id
            INNER JOIN formas_pagamento fp ON fp.id = p.forma_pagamento_id
            INNER JOIN enderecos e ON e.id = p.endereco_id
            ORDER BY p.data_pedido DESC, p.id DESC
            LIMIT 300
        `);
        return res.json({ pedidos: resultado.rows });
    } catch (erro) {
        console.error('Erro ao listar pedidos do gerente:', erro);
        return res.status(500).json({ erro: 'Não foi possível carregar os pedidos.' });
    }
}

async function atualizarStatusPedido(req, res) {
    const id = idValido(req.params.id);
    const status = typeof req.body?.status_pedido === 'string'
        ? req.body.status_pedido.trim()
        : '';

    if (!id) return res.status(400).json({ erro: 'Pedido inválido.' });
    if (!STATUS_PEDIDO.has(status)) {
        return res.status(400).json({ erro: 'Selecione um status de pedido válido.' });
    }

    try {
        const resultado = await pool.query(
            `UPDATE pedidos
             SET status_pedido = $2
             WHERE id = $1
             RETURNING id, status_pedido`,
            [id, status]
        );
        if (!resultado.rowCount) return res.status(404).json({ erro: 'Pedido não encontrado.' });
        return res.json({ pedido: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao atualizar status do pedido:', erro);
        return res.status(500).json({ erro: 'Não foi possível atualizar o pedido.' });
    }
}

async function listarServicos(req, res) {
    try {
        const resultado = await pool.query(`
            SELECT
                ip.id AS item_id,
                p.id AS pedido_id,
                p.data_pedido,
                p.status_pedido,
                p.status_pagamento,
                u.nome AS nome_cliente,
                u.email AS email_cliente,
                ip.nome_item AS nome_servico,
                ip.quantidade,
                ip.preco_unitario
            FROM itens_pedido ip
            INNER JOIN pedidos p ON p.id = ip.pedido_id
            INNER JOIN usuarios u ON u.id = p.usuario_id
            WHERE ip.servico_id IS NOT NULL
            ORDER BY p.data_pedido DESC, p.id DESC, ip.id DESC
            LIMIT 300
        `);
        return res.json({ servicos: resultado.rows });
    } catch (erro) {
        console.error('Erro ao listar serviços do gerente:', erro);
        return res.status(500).json({ erro: 'Não foi possível carregar os serviços.' });
    }
}

async function listarSolicitacoesServico(req, res) {
    try {
        const resultado = await pool.query(`
            SELECT
                s.id,
                s.tipo_servico,
                s.servico_escolhido,
                s.nome_endereco,
                s.endereco,
                s.status,
                s.criada_em,
                u.nome AS nome_cliente,
                u.email AS email_cliente,
                u.username
            FROM solicitacoes_servico s
            INNER JOIN usuarios u ON u.id = s.usuario_id
            ORDER BY s.criada_em DESC, s.id DESC
            LIMIT 500
        `);
        return res.json({ solicitacoes: resultado.rows });
    } catch (erro) {
        console.error('Erro ao listar solicitações de serviço:', erro);
        return res.status(500).json({ erro: 'Não foi possível carregar as solicitações.' });
    }
}

async function atualizarStatusSolicitacaoServico(req, res) {
    const id = idValido(req.params.id);
    const status = typeof req.body?.status === 'string'
        ? req.body.status.trim()
        : '';

    if (!id) return res.status(400).json({ erro: 'Solicitação inválida.' });
    if (!STATUS_SOLICITACAO_SERVICO.has(status)) {
        return res.status(400).json({ erro: 'Selecione um status de serviço válido.' });
    }

    try {
        const resultado = await pool.query(
            `UPDATE solicitacoes_servico
             SET status = $2
             WHERE id = $1
             RETURNING id, status`,
            [id, status]
        );
        if (!resultado.rowCount) {
            return res.status(404).json({ erro: 'Solicitação não encontrada.' });
        }
        return res.json({ solicitacao: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao atualizar status da solicitação de serviço:', erro);
        return res.status(500).json({ erro: 'Não foi possível atualizar o status da solicitação.' });
    }
}

module.exports = {
    listarPedidos,
    atualizarStatusPedido,
    listarServicos,
    listarSolicitacoesServico,
    atualizarStatusSolicitacaoServico
};
