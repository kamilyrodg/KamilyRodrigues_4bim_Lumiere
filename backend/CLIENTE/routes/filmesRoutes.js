const express = require('express');
const { listarFilmes } = require('../controllers/filmesController');

const router = express.Router();

router.get('/', listarFilmes);

module.exports = router;
