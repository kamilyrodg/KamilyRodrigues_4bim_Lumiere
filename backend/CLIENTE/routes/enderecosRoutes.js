const express = require('express');
const { obterSessao } = require('../controllers/autenticacaoController');
const {
    cadastrarEnderecos,
    listarEnderecos,
    atualizarEndereco
} = require('../controllers/enderecosController');

const router = express.Router();

router.get('/', obterSessao, listarEnderecos);
router.post('/', obterSessao, cadastrarEnderecos);
router.put('/:id', obterSessao, atualizarEndereco);

module.exports = router;
