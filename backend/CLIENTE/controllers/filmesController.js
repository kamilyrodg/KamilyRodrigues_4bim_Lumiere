const pool = require('../../db');
async function listarFilmes(req, res) {
    try {
        const consulta = `
            SELECT
                p.id,
                p.categoria_id,
                p.nome,
                p.preco,
                p.preco_pix,
                p.imagem,
                f.iso,
                f.quantidade_poses,
                COALESCE(
                    JSON_AGG(DISTINCT cf.nome)
                        FILTER (WHERE cf.nome IS NOT NULL),
                    '[]'::json
                ) AS caracteristicas
            FROM produtos p
            INNER JOIN filmes f ON f.produto_id = p.id
            LEFT JOIN filme_caracteristicas fc
                ON fc.filme_id = f.produto_id
            LEFT JOIN caracteristicas_filme cf
                ON cf.id = fc.caracteristica_id
            WHERE p.categoria_id = 3
            GROUP BY p.id, f.iso, f.quantidade_poses
            ORDER BY p.id
        `;

        const resultado = await pool.query(consulta);
        const filmes = resultado.rows;

        return res.status(200).json(filmes);
    } catch (erro) {
        console.error('Erro ao listar filmes:', erro);

        return res.status(500).json({
            mensagem: 'Erro ao buscar filmes.'
        });
    }
}

module.exports = {
    listarFilmes
};
