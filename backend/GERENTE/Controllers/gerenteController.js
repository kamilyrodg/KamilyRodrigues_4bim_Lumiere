
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
                    + (SELECT COUNT(*) FROM solicitacoes_servico)
                        AS servicos_solicitados
            `),

            // Pedidos recentes
            pool.query(`
                SELECT
                    p.id,
                    p.data_pedido,
                    p.valor_total,
                    p.status_pedido,
                    p.status_pagamento,
                    u.nome AS nome_cliente,
                    u.username
                FROM pedidos p
                INNER JOIN usuarios u
                    ON p.usuario_id = u.id
                ORDER BY p.data_pedido DESC
                LIMIT 5
            `),

            // Serviços vendidos e solicitações feitas pelo WhatsApp
            pool.query(`
                SELECT *
                FROM (
                    SELECT
                        ip.id AS item_id,
                        p.data_pedido,
                        s.nome AS nome_servico,
                        p.status_pagamento,
                        NULL::VARCHAR AS status_solicitacao,
                        'pedido'::VARCHAR AS origem
                    FROM itens_pedido ip
                    INNER JOIN pedidos p ON p.id = ip.pedido_id
                    INNER JOIN servicos s ON s.id = ip.servico_id
                    WHERE ip.servico_id IS NOT NULL

                    UNION ALL

                    SELECT
                        ss.id AS item_id,
                        ss.criada_em AS data_pedido,
                        CASE ss.tipo_servico
                            WHEN 'manutencao' THEN 'Manutenção'
                            WHEN 'revelacao' THEN 'Revelação'
                            WHEN 'digitalizacao' THEN 'Digitalização'
                        END || ': ' || ss.servico_escolhido AS nome_servico,
                        NULL::VARCHAR AS status_pagamento,
                        ss.status AS status_solicitacao,
                        'whatsapp'::VARCHAR AS origem
                    FROM solicitacoes_servico ss
                ) AS servicos_recentes
                ORDER BY data_pedido DESC, item_id DESC
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
