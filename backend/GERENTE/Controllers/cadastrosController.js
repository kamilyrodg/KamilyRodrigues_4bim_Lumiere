const pool = require('../../db');
const {
    criarHashSenha,
    validarCadastro
} = require('../../CLIENTE/controllers/autenticacaoController');

function normalizarTexto(valor) {
    return typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
}

function validarTelefone(valor) {
    const telefone = normalizarTexto(valor);
    if (telefone.length > 20) return null;
    return telefone || null;
}

function erroDeCadastro(res, erro, status = 400) {
    return res.status(status).json({ erro });
}

function erroBanco(res, erro, entidade) {
    if (erro.code === '23505') {
        return erroDeCadastro(res, 'Este e-mail ou nome de usuário já está cadastrado.', 409);
    }

    console.error(`Erro ao salvar ${entidade}:`, erro);
    return erroDeCadastro(res, `Não foi possível salvar ${entidade}.`, 500);
}

async function listarClientes(req, res) {
    try {
        const resultado = await pool.query(`
            SELECT
                u.id,
                u.nome,
                u.email,
                u.username,
                c.telefone,
                c.data_cadastro,
                c.ativo
            FROM clientes c
            INNER JOIN usuarios u ON u.id = c.usuario_id
            ORDER BY c.ativo DESC, u.nome ASC
        `);
        return res.json({ clientes: resultado.rows });
    } catch (erro) {
        console.error('Erro ao listar clientes:', erro);
        return erroDeCadastro(res, 'Não foi possível carregar os clientes.', 500);
    }
}

async function criarCliente(req, res) {
    const nome = normalizarTexto(req.body?.nome);
    const email = normalizarTexto(req.body?.email).toLowerCase();
    const username = normalizarTexto(req.body?.username).toLowerCase();
    const senha = req.body?.senha;
    const telefone = validarTelefone(req.body?.telefone);

    if (typeof req.body?.telefone === 'string' && req.body.telefone.trim().length > 20) {
        return erroDeCadastro(res, 'O telefone deve ter no máximo 20 caracteres.');
    }

    const erroValidacao = validarCadastro({ nome, email, username, senha });
    if (erroValidacao) return erroDeCadastro(res, erroValidacao);

    let cliente;
    try {
        cliente = await pool.connect();
        await cliente.query('BEGIN');

        const existente = await cliente.query(
            `SELECT 1 FROM usuarios
             WHERE LOWER(email) = $1 OR LOWER(username) = $2
             LIMIT 1`,
            [email, username]
        );
        if (existente.rowCount) {
            await cliente.query('ROLLBACK');
            return erroDeCadastro(res, 'Este e-mail ou nome de usuário já está cadastrado.', 409);
        }

        const senhaHash = await criarHashSenha(senha);
        const inserido = await cliente.query(
            `INSERT INTO usuarios (nome, email, senha_hash, username, tipo)
             VALUES ($1, $2, $3, $4, 'cliente')
             RETURNING id, nome, email, username`,
            [nome, email, senhaHash, username]
        );

        const resultado = await cliente.query(
            `INSERT INTO clientes (usuario_id, telefone)
             VALUES ($1, $2)
             ON CONFLICT (usuario_id) DO UPDATE SET telefone = EXCLUDED.telefone
             RETURNING usuario_id AS id, telefone, data_cadastro, ativo`,
            [inserido.rows[0].id, telefone]
        );

        await cliente.query('COMMIT');
        return res.status(201).json({ cliente: { ...inserido.rows[0], ...resultado.rows[0] } });
    } catch (erro) {
        if (cliente) {
            try { await cliente.query('ROLLBACK'); } catch {}
        }
        return erroBanco(res, erro, 'o cliente');
    } finally {
        if (cliente) cliente.release();
    }
}

async function atualizarCliente(req, res) {
    const id = Number.parseInt(req.params.id, 10);
    const nome = normalizarTexto(req.body?.nome);
    const email = normalizarTexto(req.body?.email).toLowerCase();
    const username = normalizarTexto(req.body?.username).toLowerCase();
    const telefone = validarTelefone(req.body?.telefone);
    const ativo = req.body?.ativo;
    const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';

    if (!Number.isSafeInteger(id) || id < 1) return erroDeCadastro(res, 'Cliente inválido.');
    if (typeof req.body?.telefone === 'string' && req.body.telefone.trim().length > 20) {
        return erroDeCadastro(res, 'O telefone deve ter no máximo 20 caracteres.');
    }
    if (typeof ativo !== 'boolean') return erroDeCadastro(res, 'Informe se o cliente está ativo.');

    const erroValidacao = validarCadastro({ nome, email, username, senha: senha || 'senha-temporaria' });
    if (erroValidacao) return erroDeCadastro(res, erroValidacao);
    if (senha && (senha.length < 8 || senha.length > 256)) {
        return erroDeCadastro(res, 'A nova senha precisa ter entre 8 e 256 caracteres.');
    }

    let cliente;
    try {
        cliente = await pool.connect();
        await cliente.query('BEGIN');

        const existente = await cliente.query(
            `SELECT 1 FROM usuarios
             WHERE (LOWER(email) = $1 OR LOWER(username) = $2)
               AND id <> $3
             LIMIT 1`,
            [email, username, id]
        );
        if (existente.rowCount) {
            await cliente.query('ROLLBACK');
            return erroDeCadastro(res, 'Este e-mail ou nome de usuário já está cadastrado.', 409);
        }

        const atualizado = await cliente.query(
            `UPDATE usuarios
             SET nome = $1, email = $2, username = $3
             WHERE id = $4 AND tipo = 'cliente'
             RETURNING id, nome, email, username`,
            [nome, email, username, id]
        );
        if (!atualizado.rowCount) {
            await cliente.query('ROLLBACK');
            return erroDeCadastro(res, 'Cliente não encontrado.', 404);
        }

        const atualizacaoCliente = await cliente.query(
            `UPDATE clientes
             SET telefone = $2, ativo = $3
             WHERE usuario_id = $1
             RETURNING usuario_id AS id, telefone, data_cadastro, ativo`,
            [id, telefone, ativo]
        );
        if (senha) {
            await cliente.query(
                'UPDATE usuarios SET senha_hash = $1 WHERE id = $2',
                [await criarHashSenha(senha), id]
            );
        }
        if (!ativo) await cliente.query('DELETE FROM sessoes WHERE usuario_id = $1', [id]);

        await cliente.query('COMMIT');
        return res.json({ cliente: { ...atualizado.rows[0], ...atualizacaoCliente.rows[0] } });
    } catch (erro) {
        if (cliente) {
            try { await cliente.query('ROLLBACK'); } catch {}
        }
        return erroBanco(res, erro, 'o cliente');
    } finally {
        if (cliente) cliente.release();
    }
}

async function atualizarStatusCliente(req, res) {
    const id = Number.parseInt(req.params.id, 10);
    const ativo = req.body?.ativo;
    if (!Number.isSafeInteger(id) || id < 1) return erroDeCadastro(res, 'Cliente inválido.');
    if (typeof ativo !== 'boolean') return erroDeCadastro(res, 'Informe um status válido.');

    try {
        const resultado = await pool.query(
            `UPDATE clientes SET ativo = $2
             WHERE usuario_id = $1
             RETURNING usuario_id AS id, ativo`,
            [id, ativo]
        );
        if (!resultado.rowCount) return erroDeCadastro(res, 'Cliente não encontrado.', 404);
        if (!ativo) await pool.query('DELETE FROM sessoes WHERE usuario_id = $1', [id]);
        return res.json({ cliente: resultado.rows[0] });
    } catch (erro) {
        return erroBanco(res, erro, 'o status do cliente');
    }
}

async function excluirCliente(req, res) {
    req.body = { ...(req.body || {}), ativo: false };
    return atualizarStatusCliente(req, res);
}

function validarDadosFuncionario(body) {
    const nome = normalizarTexto(body?.nome);
    const email = normalizarTexto(body?.email).toLowerCase();
    const cargo = normalizarTexto(body?.cargo);
    const telefoneBruto = normalizarTexto(body?.telefone);

    if (nome.length < 2 || nome.length > 150) return { erro: 'Informe um nome de até 150 caracteres.' };
    if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: 'Informe um e-mail válido.' };
    if (!cargo || cargo.length > 100) return { erro: 'Informe um cargo de até 100 caracteres.' };
    if (telefoneBruto.length > 20) return { erro: 'O telefone deve ter no máximo 20 caracteres.' };
    return { nome, email, cargo, telefone: telefoneBruto || null };
}

async function listarFuncionarios(req, res) {
    try {
        const resultado = await pool.query(`
            SELECT id, nome, email, telefone, cargo, data_cadastro, ativo
            FROM funcionarios
            ORDER BY ativo DESC, nome ASC
        `);
        return res.json({ funcionarios: resultado.rows });
    } catch (erro) {
        console.error('Erro ao listar funcionários:', erro);
        return erroDeCadastro(res, 'Não foi possível carregar os funcionários.', 500);
    }
}

async function criarFuncionario(req, res) {
    const dados = validarDadosFuncionario(req.body);
    if (dados.erro) return erroDeCadastro(res, dados.erro);
    try {
        const resultado = await pool.query(
            `INSERT INTO funcionarios (nome, email, telefone, cargo)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nome, email, telefone, cargo, data_cadastro, ativo`,
            [dados.nome, dados.email, dados.telefone, dados.cargo]
        );
        return res.status(201).json({ funcionario: resultado.rows[0] });
    } catch (erro) {
        if (erro.code === '23505') return erroDeCadastro(res, 'Este e-mail já está cadastrado para outro funcionário.', 409);
        return erroBanco(res, erro, 'o funcionário');
    }
}

async function atualizarFuncionario(req, res) {
    const id = Number.parseInt(req.params.id, 10);
    const dados = validarDadosFuncionario(req.body);
    const ativo = req.body?.ativo;
    if (!Number.isSafeInteger(id) || id < 1) return erroDeCadastro(res, 'Funcionário inválido.');
    if (dados.erro) return erroDeCadastro(res, dados.erro);
    if (typeof ativo !== 'boolean') return erroDeCadastro(res, 'Informe se o funcionário está ativo.');
    try {
        const resultado = await pool.query(
            `UPDATE funcionarios
             SET nome = $1, email = $2, telefone = $3, cargo = $4, ativo = $5
             WHERE id = $6
             RETURNING id, nome, email, telefone, cargo, data_cadastro, ativo`,
            [dados.nome, dados.email, dados.telefone, dados.cargo, ativo, id]
        );
        if (!resultado.rowCount) return erroDeCadastro(res, 'Funcionário não encontrado.', 404);
        return res.json({ funcionario: resultado.rows[0] });
    } catch (erro) {
        if (erro.code === '23505') return erroDeCadastro(res, 'Este e-mail já está cadastrado para outro funcionário.', 409);
        return erroBanco(res, erro, 'o funcionário');
    }
}

async function atualizarStatusFuncionario(req, res) {
    const id = Number.parseInt(req.params.id, 10);
    const ativo = req.body?.ativo;
    if (!Number.isSafeInteger(id) || id < 1) return erroDeCadastro(res, 'Funcionário inválido.');
    if (typeof ativo !== 'boolean') return erroDeCadastro(res, 'Informe um status válido.');
    try {
        const resultado = await pool.query(
            `UPDATE funcionarios SET ativo = $2 WHERE id = $1
             RETURNING id, ativo`,
            [id, ativo]
        );
        if (!resultado.rowCount) return erroDeCadastro(res, 'Funcionário não encontrado.', 404);
        return res.json({ funcionario: resultado.rows[0] });
    } catch (erro) {
        return erroBanco(res, erro, 'o status do funcionário');
    }
}

async function excluirFuncionario(req, res) {
    req.body = { ...(req.body || {}), ativo: false };
    return atualizarStatusFuncionario(req, res);
}

module.exports = {
    listarClientes,
    criarCliente,
    atualizarCliente,
    atualizarStatusCliente,
    excluirCliente,
    listarFuncionarios,
    criarFuncionario,
    atualizarFuncionario,
    atualizarStatusFuncionario,
    excluirFuncionario
};
