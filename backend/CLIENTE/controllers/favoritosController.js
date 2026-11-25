const pool = require('../../db');
function obterProdutoId(req, res) {
    const { produtoId } = req.params;
    const id = Number(produtoId);

    if (!/^\d+$/.test(produtoId) || !Number.isSafeInteger(id) || id < 1) {
        res.status(400).json({ mensagem: 'ID do produto inválido.' });
        return null;
    }

    return id;
}

async function listarFavoritos(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT p.id, p.nome, p.preco, p.preco_pix, p.imagem
             FROM favoritos f
             JOIN produtos p ON p.id = f.produto_id
             WHERE f.usuario_id = $1
             ORDER BY p.id`,
            [req.usuarioAutenticado.id]
        );

        const favoritos = resultado.rows;

        return res.status(200).json(favoritos);
    } catch (erro) {
        console.error('Erro ao listar favoritos:', erro);
        return res.status(500).json({
            mensagem: 'Não foi possível carregar seus favoritos.'
        });
    }
}

async function adicionarFavorito(req, res) {
    const produtoId = obterProdutoId(req, res);

    if (produtoId === null) {
        return;
    }

    try {
        const resultado = await pool.query(
            `INSERT INTO favoritos (usuario_id, produto_id)
             SELECT $1, p.id
             FROM produtos p
             WHERE p.id = $2
             ON CONFLICT (usuario_id, produto_id) DO NOTHING
             RETURNING produto_id`,
            [req.usuarioAutenticado.id, produtoId]
        );

        if (resultado.rowCount === 0) {
            const produto = await pool.query(
                'SELECT 1 FROM produtos WHERE id = $1',
                [produtoId]
            );

            if (produto.rowCount === 0) {
                return res.status(404).json({ mensagem: 'Produto não encontrado.' });
            }
        }

        return res.status(204).end();
    } catch (erro) {
        console.error('Erro ao adicionar favorito:', erro);
        return res.status(500).json({
            mensagem: 'Não foi possível adicionar o produto aos favoritos.'
        });
    }
}

async function removerFavorito(req, res) {
    const produtoId = obterProdutoId(req, res);

    if (produtoId === null) {
        return;
    }

    try {
        await pool.query(
            `DELETE FROM favoritos
             WHERE usuario_id = $1 AND produto_id = $2`,
            [req.usuarioAutenticado.id, produtoId]
        );

        return res.status(204).end();
    } catch (erro) {
        console.error('Erro ao remover favorito:', erro);
        return res.status(500).json({
            mensagem: 'Não foi possível remover o produto dos favoritos.'
        });
    }
}

module.exports = {
    listarFavoritos,
    adicionarFavorito,
    removerFavorito
};
