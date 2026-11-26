
const pool = require('../../db');

async function carregarDashboard(req, res) {
    try {
        const [resumo, pedidos, servicos] = await Promise.all([

            // Resumo da loja
            pool.query(`
                SELECT
                    (SELECT COUNT(*) FROM pedidos)
                        AS pedidos_recebidos,

                    (SELECT COUNT(*) FROM produtos)
                        AS produtos_cadastrados,

                    (SELECT COUNT(*)
                     FROM itens_pedido
                     WHERE servico_id IS NOT NULL)
                        AS servicos_solicitados
            `),

            // Pedidos recentes
            pool.query(`
                SELECT
                    p.id,
                    p.data_pedido,
                    p.valor_total,
                    p.status_pagamento,
                    u.nome AS nome_cliente,
                    u.username
                FROM pedidos p
                INNER JOIN usuarios u
                    ON p.usuario_id = u.id
                ORDER BY p.data_pedido DESC
                LIMIT 5
            `),

            // Serviços solicitados recentemente
            pool.query(`
                SELECT
                    ip.id AS item_id,
                    p.id AS pedido_id,
                    p.data_pedido,
                    p.status_pagamento,
                    s.nome AS nome_servico,
                    ip.quantidade,
                    ip.preco_unitario,
                    u.nome AS nome_cliente
                FROM itens_pedido ip
                INNER JOIN pedidos p
                    ON ip.pedido_id = p.id
                INNER JOIN servicos s
                    ON ip.servico_id = s.id
                INNER JOIN usuarios u
                    ON p.usuario_id = u.id
                WHERE ip.servico_id IS NOT NULL
                ORDER BY p.data_pedido DESC
                LIMIT 5
            `)
        ]);

        res.status(200).json({
            resumo: resumo.rows[0],
            pedidos: pedidos.rows,
            servicos: servicos.rows
        });

    } catch (erro) {
        console.error('Erro ao carregar dashboard:', erro);

        res.status(500).json({
            mensagem: 'Não foi possível carregar os dados do painel.'
        });
    }
}

module.exports = {
    carregarDashboard
};
