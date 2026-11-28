const express = require('express');
const { obterSessao } = require('../controllers/autenticacaoController');
const { criarSolicitacao } = require('../controllers/solicitacoesServicoController');

const router = express.Router();

router.post('/', obterSessao, criarSolicitacao);

module.exports = router;
