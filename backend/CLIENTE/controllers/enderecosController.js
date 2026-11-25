const pool = require('../../db');

function validarEnderecos(value) {
    if (!Array.isArray(value) || value.length === 0) {
        return {
            erro: 'Cadastre pelo menos um endereço.',
            enderecos: null
        };
    }

    const enderecos = [];

    for (const endereco of value) {
        if (
            !endereco ||
            typeof endereco.nome_endereco !== 'string' ||
            typeof endereco.endereco !== 'string'
        ) {
            return {
                erro: 'Preencha o nome e o endereço completo.',
                enderecos: null
            };
        }

        const nomeEndereco = endereco.nome_endereco.trim();
        const enderecoCompleto = endereco.endereco.trim();

        if (!nomeEndereco || nomeEndereco.length > 50 || !enderecoCompleto) {
            return {
                erro: 'Informe um nome com até 50 caracteres e o endereço completo.',
                enderecos: null
            };
        }

        enderecos.push({
            nome_endereco: nomeEndereco,
            endereco: enderecoCompleto
        });
    }

    return { erro: null, enderecos };
}

function validarEnderecoEditado(value) {
    if (!value || typeof value !== 'object') {
        return { erro: 'Informe os dados do endereço.', endereco: null };
    }

    const campos = [
        'nome_endereco',
        'rua',
        'numero',
        'complemento',
        'estado',
        'cep'
    ];

    if (campos.some(campo => typeof value[campo] !== 'string')) {
        return { erro: 'Preencha todos os campos obrigatórios.', endereco: null };
    }

    const endereco = {
        nome_endereco: value.nome_endereco.trim(),
        rua: value.rua.trim(),
        numero: value.numero.trim(),
        complemento: value.complemento.trim(),
        estado: value.estado.trim(),
        cep: value.cep.trim()
    };

    if (
        !endereco.nome_endereco ||
        endereco.nome_endereco.length > 50 ||
        !endereco.rua ||
        endereco.rua.length > 150 ||
        !endereco.numero ||
        endereco.numero.length > 20 ||
        endereco.complemento.length > 100 ||
        !endereco.estado ||
        endereco.estado.length > 100 ||
        !/^\d{5}-?\d{3}$/.test(endereco.cep)
    ) {
        return { erro: 'Confira os dados do endereço e o CEP.', endereco: null };
    }

    endereco.texto = [
        `Rua: ${endereco.rua}`,
        `Número: ${endereco.numero}`,
        endereco.complemento && `Complemento: ${endereco.complemento}`,
        `Estado: ${endereco.estado}`,
        `CEP: ${endereco.cep}`
    ].filter(Boolean).join('\n');

    return { erro: null, endereco };
}

async function listarEnderecos(req, res) {
    try {
        const resultado = await pool.query(
            `SELECT id, nome_endereco, endereco
             FROM enderecos
             WHERE usuario_id = $1
             ORDER BY id`,
            [req.usuarioAutenticado.id]
        );

        return res.status(200).json({ enderecos: resultado.rows });
    } catch (erro) {
        console.error('Erro ao carregar endereços da conta:', erro);
        return res.status(500).json({
            erro: 'Não foi possível carregar seus endereços.'
        });
    }
}

async function atualizarEndereco(req, res) {
    const resultadoValidacao = validarEnderecoEditado(req.body);

    if (resultadoValidacao.erro) {
        return res.status(400).json({ erro: resultadoValidacao.erro });
    }

    const id = Number(req.params.id);
    if (
        !/^[1-9]\d*$/.test(req.params.id) ||
        !Number.isSafeInteger(id) ||
        id > 2147483647
    ) {
        return res.status(400).json({ erro: 'Endereço inválido.' });
    }

    try {
        const resultado = await pool.query(
            `UPDATE enderecos
             SET nome_endereco = $1, endereco = $2
             WHERE id = $3 AND usuario_id = $4
             RETURNING id, nome_endereco, endereco`,
            [
                resultadoValidacao.endereco.nome_endereco,
                resultadoValidacao.endereco.texto,
                id,
                req.usuarioAutenticado.id
            ]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ erro: 'Endereço não encontrado.' });
        }

        return res.status(200).json({ endereco: resultado.rows[0] });
    } catch (erro) {
        console.error('Erro ao atualizar endereço da conta:', erro);
        return res.status(500).json({
            erro: 'Não foi possível atualizar o endereço.'
        });
    }
}

async function cadastrarEnderecos(req, res) {
    const resultadoValidacao = validarEnderecos(
        req.body && req.body.enderecos
    );

    if (resultadoValidacao.erro) {
        return res.status(400).json({ erro: resultadoValidacao.erro });
    }

    let cliente;

    try {
        cliente = await pool.connect();
        await cliente.query('BEGIN');

        const enderecosSalvos = [];

        for (const endereco of resultadoValidacao.enderecos) {
            const resultado = await cliente.query(
                `INSERT INTO enderecos (usuario_id, nome_endereco, endereco)
                 VALUES ($1, $2, $3)
                 RETURNING id, nome_endereco, endereco`,
                [
                    req.usuarioAutenticado.id,
                    endereco.nome_endereco,
                    endereco.endereco
                ]
            );
            enderecosSalvos.push(resultado.rows[0]);
        }

        await cliente.query('COMMIT');
        return res.status(201).json({ enderecos: enderecosSalvos });
    } catch (erro) {
        if (cliente) {
            try {
                await cliente.query('ROLLBACK');
            } catch (erroRollback) {
                console.error('Erro ao desfazer cadastro de endereços:', erroRollback);
            }
        }

        console.error('Erro ao cadastrar endereços:', erro);
        return res.status(500).json({
            erro: 'Não foi possível salvar seus endereços.'
        });
    } finally {
        if (cliente) {
            cliente.release();
        }
    }
}

module.exports = {
    cadastrarEnderecos,
    listarEnderecos,
    atualizarEndereco
};
