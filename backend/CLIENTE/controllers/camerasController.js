const pool = require('../../db');
async function listarCameras(req, res) {
    try {
        const { tipo } = req.query;

        let consulta = `
            SELECT
                id,
                categoria_id,
                nome,
                preco,
                preco_pix,
                imagem
            FROM produtos
            WHERE categoria_id IN (1, 2)
        `;

        const valores = [];

        if (tipo === 'analogica') {
            consulta += ' AND categoria_id = $1';
            valores.push(1);
        } else if (tipo === 'digital') {
            consulta += ' AND categoria_id = $1';
            valores.push(2);
        } else if (
            tipo !== undefined &&
            tipo !== 'todas'
        ) {
            return res.status(400).json({
                mensagem: 'Tipo de câmera inválido.'
            });
        }

        consulta += ' ORDER BY id';

        const resultado = await pool.query(
            consulta,
            valores
        );

        const cameras = resultado.rows;

        return res.status(200).json(cameras);

    } catch (erro) {
        console.error(
            'Erro ao listar câmeras:',
            erro
        );

        return res.status(500).json({
            mensagem: 'Erro ao buscar câmeras.'
        });
    }
}

async function buscarCameraPorId(req, res) {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                mensagem: 'ID da câmera inválido.'
            });
        }

        const consulta = `
            SELECT
                id,
                categoria_id,
                nome,
                preco,
                preco_pix,
                imagem
            FROM produtos
            WHERE id = $1
            AND categoria_id IN (1, 2)
        `;

        const resultado = await pool.query(
            consulta,
            [id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensagem: 'Câmera não encontrada.'
            });
        }

        const camera = resultado.rows[0];

        return res.status(200).json(camera);

    } catch (erro) {
        console.error(
            'Erro ao buscar câmera:',
            erro
        );

        return res.status(500).json({
            mensagem: 'Erro ao buscar câmera.'
        });
    }
}

module.exports = {
    listarCameras,
    buscarCameraPorId
};