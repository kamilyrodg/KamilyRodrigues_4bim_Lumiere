
const pool = require('../../db');
async function listarLentes(req, res) {
    try {

        const consulta = `
            SELECT
                p.id,
                p.categoria_id,
                p.nome,
                p.preco,
                p.preco_pix,
                p.imagem,
                COALESCE(
                    ARRAY_AGG(DISTINCT cl.nome)
                    FILTER (WHERE cl.nome IS NOT NULL),
                    ARRAY[]::VARCHAR[]
                ) AS caracteristicas
            FROM produtos p
            LEFT JOIN lente_caracteristicas lc
                ON lc.lente_id = p.id
            LEFT JOIN caracteristicas_lente cl
                ON cl.id = lc.caracteristica_id
            WHERE p.categoria_id = 4
            GROUP BY p.id
            ORDER BY p.id
        `;

        const resultado = await pool.query(consulta);

        const lentes = resultado.rows;

        return res.status(200).json(lentes);

    } catch (erro) {

        console.error(
            'Erro ao listar lentes:',
            erro
        );

        return res.status(500).json({
            mensagem: 'Erro ao buscar lentes.'
        });

    }
}

async function buscarLentePorId(req, res) {
    try {

        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                mensagem: 'ID da lente inválido.'
            });
        }

        const consulta = `
            SELECT
                p.id,
                p.categoria_id,
                p.nome,
                p.preco,
                p.preco_pix,
                p.imagem,
                COALESCE(
                    ARRAY_AGG(DISTINCT cl.nome)
                    FILTER (WHERE cl.nome IS NOT NULL),
                    ARRAY[]::VARCHAR[]
                ) AS caracteristicas
            FROM produtos p
            LEFT JOIN lente_caracteristicas lc
                ON lc.lente_id = p.id
            LEFT JOIN caracteristicas_lente cl
                ON cl.id = lc.caracteristica_id
            WHERE p.id = $1
            AND p.categoria_id = 4
            GROUP BY p.id
        `;

        const resultado = await pool.query(
            consulta,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Lente não encontrada.'
            });
        }

        const lente = resultado.rows[0];

        return res.status(200).json(lente);

    } catch (erro) {

        console.error(
            'Erro ao buscar lente:',
            erro
        );

        return res.status(500).json({
            mensagem: 'Erro ao buscar lente.'
        });

    }
}

module.exports = {
    listarLentes,
    buscarLentePorId
};
