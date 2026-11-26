
const express = require('express');
const crypto = require('crypto');
const pool = require('../../db');

const router = express.Router();

const gerenteController = require('../Controllers/gerenteController');

// Verificar sessão do usuário
async function verificarGerente(req, res, next) {
    try {
        const cookies = req.headers.cookie || '';

        const cookieSessao = cookies
            .split(';')
            .map(cookie => cookie.trim())
            .find(cookie => cookie.startsWith('lumiere_session='));

        if (!cookieSessao) {
            return res.status(401).json({
                mensagem: 'Você precisa estar autenticado.'
            });
        }

        const token = decodeURIComponent(
            cookieSessao.substring('lumiere_session='.length)
        );

        if (!token) {
            return res.status(401).json({
                mensagem: 'Sessão inválida.'
            });
        }

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const resultado = await pool.query(`
            SELECT
                u.id,
                u.nome,
                u.username,
                u.email,
                u.tipo
            FROM sessoes s
            INNER JOIN usuarios u
                ON s.usuario_id = u.id
            WHERE s.token_hash = $1
              AND s.expira_em > CURRENT_TIMESTAMP
        `, [tokenHash]);

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensagem: 'Sessão expirada ou inválida.'
            });
        }

        const usuario = resultado.rows[0];

        if (usuario.tipo !== 'gerente') {
            return res.status(403).json({
                mensagem: 'Acesso permitido somente para gerentes.'
            });
        }

        req.usuarioAutenticado = usuario;

        next();

    } catch (erro) {
        console.error('Erro ao verificar gerente:', erro);

        res.status(500).json({
            mensagem: 'Erro ao verificar autorização.'
        });
    }
}

// Dashboard
router.get(
    '/dashboard',
    verificarGerente,
    gerenteController.carregarDashboard
);

module.exports = router;
