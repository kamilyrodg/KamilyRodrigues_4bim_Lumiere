const express = require('express');
const { obterSessao } = require('../controllers/autenticacaoController');
const {
    listarFavoritos,
    adicionarFavorito,
    removerFavorito
} = require('../controllers/favoritosController');

const router = express.Router();

router.use(obterSessao);
router.get('/', listarFavoritos);
router.post('/:produtoId', adicionarFavorito);
router.delete('/:produtoId', removerFavorito);

module.exports = router;
