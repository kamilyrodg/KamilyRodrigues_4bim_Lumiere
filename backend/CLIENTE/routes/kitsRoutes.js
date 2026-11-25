
const express = require('express');

const router = express.Router();

const {
    listarKits,
    buscarKitPorId
} = require('../controllers/kitsController');


router.get('/', listarKits);

router.get('/:id', buscarKitPorId);


module.exports = router;
