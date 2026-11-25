
const pool = require('../../db');
async function listarKits(req, res) {
    try {

        const consulta = `
            SELECT
                p.id,
                p.nome,
                p.preco,
                p.preco_pix,
                p.imagem,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', produto.id,
                            'nome', produto.nome,
                            'imagem', produto.imagem,
                            'quantidade', kp.quantidade
                        )
                    ) FILTER (WHERE produto.id IS NOT NULL),
                    '[]'
                ) AS produtos

            FROM produtos p

            LEFT JOIN kits_produto kp
                ON kp.kit_id = p.id

            LEFT JOIN produtos produto
                ON produto.id = kp.produto_id

            WHERE p.categoria_id = 5

            GROUP BY p.id

            ORDER BY p.id;
        `;

        const resultado = await pool.query(consulta);

        res.json(resultado.rows);

    } catch (erro) {
        console.error('Erro ao listar kits:', erro);

        res.status(500).json({
            mensagem: 'Erro ao listar os kits.'
        });
    }
}


async function buscarKitPorId(req, res) {
    try {

        const { id } = req.params;

        const consulta = `
            SELECT
                p.id,
                p.nome,
                p.preco,
                p.preco_pix,
                p.imagem,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', produto.id,
                            'nome', produto.nome,
                            'preco', produto.preco,
                            'imagem', produto.imagem,
                            'quantidade', kp.quantidade
                        )
                    ) FILTER (WHERE produto.id IS NOT NULL),
                    '[]'
                ) AS produtos

            FROM produtos p

            LEFT JOIN kits_produto kp
                ON kp.kit_id = p.id

            LEFT JOIN produtos produto
                ON produto.id = kp.produto_id

            WHERE p.id = $1
            AND p.categoria_id = 5

            GROUP BY p.id;
        `;

        const resultado = await pool.query(consulta, [id]);

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Kit não encontrado.'
            });
        }

        res.json(resultado.rows[0]);

    } catch (erro) {
        console.error('Erro ao buscar kit:', erro);

        res.status(500).json({
            mensagem: 'Erro ao buscar o kit.'
        });
    }
}


module.exports = {
    listarKits,
    buscarKitPorId
};
