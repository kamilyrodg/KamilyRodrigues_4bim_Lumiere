const express = require('express');
const { obterSessao } = require('../controllers/autenticacaoController');
const {
    listarFormasPagamento,
    obterCarrinho,
    sincronizarCarrinho,
    gerarPixPrevia,
    criarPedido
} = require('../controllers/finalizarCompraController');

const router = express.Router();

router.use(obterSessao);
router.get('/formas-pagamento', listarFormasPagamento);
router.get('/carrinho', obterCarrinho);
router.post('/carrinho', sincronizarCarrinho);
router.post('/pix', gerarPixPrevia);
router.post('/', criarPedido);

module.exports = router;
