const { randomBytes, scrypt, timingSafeEqual, createHash } = require('crypto');
const { promisify } = require('util');
const pool = require('../../db');

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = 'lumiere_session';
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

function normalizarUsuario(usuario) {
    return {
        id: usuario.id,
        nome: usuario.nome || usuario.username,
        email: usuario.email,
        username: usuario.username,
        tipo: usuario.tipo
    };
}

function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}

function definirCookieSessao(res, token) {
    res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_DURATION_SECONDS * 1000,
        path: '/'
    });
}

function limparCookieSessao(res) {
    res.clearCookie(SESSION_COOKIE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });
}

function lerCookie(req, nome) {
    const cookies = (req.headers.cookie || '').split(';');
    const cookie = cookies.find(function (item) {
        return item.trim().startsWith(`${nome}=`);
    });

    if (!cookie) {
        return null;
    }

    try {
        return decodeURIComponent(cookie.trim().slice(nome.length + 1));
    } catch {
        return null;
    }
}

async function criarHashSenha(senha) {
    const salt = randomBytes(16).toString('hex');
    const hash = await scryptAsync(senha, salt, 64);
    return `scrypt$${salt}$${hash.toString('hex')}`;
}

async function verificarSenha(senha, senhaHash) {
    const [algoritmo, salt, hashSalvo] = (senhaHash || '').split('$');
    if (algoritmo !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/i.test(hashSalvo || '')) {
        return false;
    }

    const hashCalculado = await scryptAsync(senha, salt, 64);
    return timingSafeEqual(Buffer.from(hashSalvo, 'hex'), hashCalculado);
}

function validarCadastro({ nome, email, username, senha }) {
    if (
        typeof nome !== 'string' ||
        typeof email !== 'string' ||
        typeof username !== 'string' ||
        typeof senha !== 'string'
    ) {
        return 'Preencha todos os campos para continuar.';
    }

    const partesNome = nome.trim().split(/\s+/);
    if (partesNome.length < 2 || nome.trim().length > 150) {
        return 'Informe seu nome e sobrenome, com até 150 caracteres.';
    }

    if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return 'Informe um e-mail válido.';
    }

    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(username)) {
        return 'O usuário deve ter de 3 a 50 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.';
    }

    if (senha.length < 8 || senha.length > 256) {
        return 'A senha precisa ter entre 8 e 256 caracteres.';
    }

    return null;
}

async function cadastrar(req, res) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const nome = typeof body.nome === 'string'
        ? body.nome.trim().replace(/\s+/g, ' ')
        : body.nome;
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : body.email;
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : body.username;
    const senha = body.senha;
    const erroValidacao = validarCadastro({ nome, email, username, senha });

    if (erroValidacao) {
        return res.status(400).json({ erro: erroValidacao });
    }

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

        if (existente.rowCount > 0) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({
                erro: 'Este e-mail ou nome de usuário já está cadastrado.'
            });
        }

        const senhaHash = await criarHashSenha(senha);
        const resultado = await cliente.query(
            `INSERT INTO usuarios (nome, email, senha_hash, username)
             VALUES ($1, $2, $3, $4)
             RETURNING id, nome, email, username, tipo`,
            [nome, email, senhaHash, username]
        );

        const token = await criarTokenSessao(resultado.rows[0].id, cliente);
        await cliente.query('COMMIT');
        definirCookieSessao(res, token);

        return res.status(201).json({ usuario: normalizarUsuario(resultado.rows[0]) });
    } catch (erro) {
        if (cliente) {
            try {
                await cliente.query('ROLLBACK');
            } catch (erroRollback) {
                console.error('Erro ao desfazer cadastro:', erroRollback);
            }
        }

        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Este e-mail ou nome de usuário já está cadastrado.'
            });
        }

        console.error('Erro ao cadastrar usuário:', erro);
        return res.status(500).json({ erro: 'Não foi possível concluir o cadastro.' });
    } finally {
        if (cliente) {
            cliente.release();
        }
    }
}

async function criarTokenSessao(usuarioId, executor = pool) {
    const token = randomBytes(32).toString('hex');
    await executor.query('DELETE FROM sessoes WHERE expira_em <= NOW()');
    await executor.query(
        `INSERT INTO sessoes (token_hash, usuario_id, expira_em)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [hashToken(token), usuarioId]
    );
    return token;
}

async function criarSessao(usuarioId, res) {
    const token = await criarTokenSessao(usuarioId);
    definirCookieSessao(res, token);
}

async function entrar(req, res) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const identificador = typeof body.identificador === 'string'
        ? body.identificador.trim().toLowerCase()
        : '';
    const senha = body.senha;

    if (!identificador || typeof senha !== 'string' || !senha) {
        return res.status(400).json({ erro: 'Informe seu usuário ou e-mail e a senha.' });
    }

    try {
        const resultado = await pool.query(
            `SELECT u.id, u.nome, u.email, u.username, u.senha_hash, u.tipo
             FROM usuarios u
             LEFT JOIN clientes c ON c.usuario_id = u.id
             WHERE (LOWER(u.email) = $1 OR LOWER(u.username) = $1)
               AND (u.tipo <> 'cliente' OR c.ativo IS TRUE)
             LIMIT 1`,
            [identificador]
        );
        const usuario = resultado.rows[0];

        if (!usuario || !(await verificarSenha(senha, usuario.senha_hash))) {
            return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
        }

        await criarSessao(usuario.id, res);
        return res.json({ usuario: normalizarUsuario(usuario) });
    } catch (erro) {
        console.error('Erro ao autenticar usuário:', erro);
        return res.status(500).json({ erro: 'Não foi possível entrar. Tente novamente.' });
    }
}

async function obterSessao(req, res, next) {
    const token = lerCookie(req, SESSION_COOKIE);

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
        return res.status(401).json({ erro: 'É necessário entrar na conta.' });
    }

    try {
        const resultado = await pool.query(
            `SELECT u.id, u.nome, u.email, u.username, u.tipo
             FROM sessoes s
             JOIN usuarios u ON u.id = s.usuario_id
             LEFT JOIN clientes c ON c.usuario_id = u.id
             WHERE s.token_hash = $1
               AND s.expira_em > NOW()
               AND (u.tipo <> 'cliente' OR c.ativo IS TRUE)
             LIMIT 1`,
            [hashToken(token)]
        );

        if (!resultado.rows[0]) {
            limparCookieSessao(res);
            return res.status(401).json({ erro: 'Sua sessão expirou. Entre novamente.' });
        }

        req.usuarioAutenticado = normalizarUsuario(resultado.rows[0]);
        return next();
    } catch (erro) {
        console.error('Erro ao verificar sessão:', erro);
        return res.status(500).json({ erro: 'Não foi possível verificar a sessão.' });
    }
}

function obterUsuarioAtual(req, res) {
    return res.json({ usuario: req.usuarioAutenticado });
}

async function atualizarUsuarioAtual(req, res) {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const nome = typeof body.nome === 'string'
        ? body.nome.trim().replace(/\s+/g, ' ')
        : '';
    const email = typeof body.email === 'string'
        ? body.email.trim().toLowerCase()
        : '';
    const username = typeof body.username === 'string'
        ? body.username.trim().toLowerCase()
        : '';

    if (!nome || !email || !username) {
        return res.status(400).json({ erro: 'Preencha todos os campos para continuar.' });
    }

    if (nome.split(/\s+/).length < 2 || nome.length > 150) {
        return res.status(400).json({
            erro: 'Informe seu nome e sobrenome, com até 150 caracteres.'
        });
    }

    if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }

    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(username)) {
        return res.status(400).json({
            erro: 'O usuário deve ter de 3 a 50 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.'
        });
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
            [email, username, req.usuarioAutenticado.id]
        );

        if (existente.rowCount > 0) {
            await cliente.query('ROLLBACK');
            return res.status(409).json({
                erro: 'Este e-mail ou nome de usuário já está cadastrado.'
            });
        }

        const resultado = await cliente.query(
            `UPDATE usuarios
             SET nome = $1, email = $2, username = $3
             WHERE id = $4
             RETURNING id, nome, email, username, tipo`,
            [nome, email, username, req.usuarioAutenticado.id]
        );

        if (resultado.rowCount === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ erro: 'Conta não encontrada.' });
        }

        await cliente.query('COMMIT');
        return res.status(200).json({ usuario: normalizarUsuario(resultado.rows[0]) });
    } catch (erro) {
        if (cliente) {
            try {
                await cliente.query('ROLLBACK');
            } catch (erroRollback) {
                console.error('Erro ao desfazer atualização da conta:', erroRollback);
            }
        }

        if (erro.code === '23505') {
            return res.status(409).json({
                erro: 'Este e-mail ou nome de usuário já está cadastrado.'
            });
        }

        console.error('Erro ao atualizar dados da conta:', erro);
        return res.status(500).json({
            erro: 'Não foi possível atualizar os dados da conta.'
        });
    } finally {
        if (cliente) {
            cliente.release();
        }
    }
}

async function sair(req, res) {
    const token = lerCookie(req, SESSION_COOKIE);

    try {
        if (token && /^[a-f0-9]{64}$/i.test(token)) {
            await pool.query('DELETE FROM sessoes WHERE token_hash = $1', [hashToken(token)]);
        }

        limparCookieSessao(res);
        return res.status(204).end();
    } catch (erro) {
        console.error('Erro ao encerrar sessão:', erro);
        return res.status(500).json({ erro: 'Não foi possível sair da conta.' });
    }
}

module.exports = {
    cadastrar,
    entrar,
    criarHashSenha,
    validarCadastro,
    obterSessao,
    obterUsuarioAtual,
    atualizarUsuarioAtual,
    sair
};
