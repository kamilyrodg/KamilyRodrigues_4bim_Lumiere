
const express = require('express');

const {
    listarLentes,
    buscarLentePorId
} = require('../controllers/lentesController');

const router = express.Router();

router.get('/', listarLentes);
router.get('/:id', buscarLentePorId);

module.exports = router;