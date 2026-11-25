const express = require('express');
const {
    cadastrar,
    entrar,
    obterSessao,
    obterUsuarioAtual,
    atualizarUsuarioAtual,
    sair
} = require('../controllers/autenticacaoController');

const router = express.Router();

router.post('/cadastro', cadastrar);
router.post('/login', entrar);
router.get('/me', obterSessao, obterUsuarioAtual);
router.put('/me', obterSessao, atualizarUsuarioAtual);
router.post('/logout', sair);

module.exports = router;
