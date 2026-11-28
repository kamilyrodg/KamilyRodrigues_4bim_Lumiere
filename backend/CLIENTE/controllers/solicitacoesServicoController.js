const pool = require('../../db');

const TIPOS_SERVICO = new Set(['manutencao', 'revelacao', 'digitalizacao']);

async function criarSolicitacao(req, res) {
    const tipoServico = typeof req.body?.tipo_servico === 'string'
        ? req.body.tipo_servico.trim()
        : '';
    const servicoEscolhido = typeof req.body?.servico_escolhido === 'string'
        ? req.body.servico_escolhido.trim()
        : '';
    const enderecoId = Number.parseInt(req.body?.endereco_id, 10);

    if (!TIPOS_SERVICO.has(tipoServico)) {
        return res.status(400).json({ erro: 'Selecione um tipo de serviço válido.' });
    }
    if (!servicoEscolhido || servicoEscolhido.length > 150) {
        return res.status(400).json({ erro: 'Selecione o serviço desejado.' });
    }
    if (!Number.isSafeInteger(enderecoId) || enderecoId < 1) {
        return res.status(400).json({ erro: 'Selecione um endereço cadastrado.' });
    }

    try {
        const resultado = await pool.query(
            `INSERT INTO solicitacoes_servico (
                usuario_id, endereco_id, tipo_servico, servico_escolhido,
                nome_endereco, endereco
             )
             SELECT e.usuario_id, e.id, $3, $4, e.nome_endereco, e.endereco
             FROM enderecos e
             WHERE e.id = $1 AND e.usuario_id = $2
             RETURNING id, status, criada_em`,
            [enderecoId, req.usuarioAutenticado.id, tipoServico, servicoEscolhido]
        );

        if (!resultado.rowCount) {
            return res.status(404).json({ erro: 'O endereço selecionado não pertence à sua conta.' });
        }

        return res.status(201).json({ solicitacao: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao registrar solicitação de serviço:', erro);
        return res.status(500).json({ erro: 'Não foi possível registrar a solicitação.' });
    }
}

module.exports = { criarSolicitacao };
