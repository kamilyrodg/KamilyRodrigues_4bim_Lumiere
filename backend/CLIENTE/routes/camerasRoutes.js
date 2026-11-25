const express = require('express');

const {
    listarCameras,
    buscarCameraPorId
} = require('../controllers/camerasController');

const router = express.Router();

router.get('/', listarCameras);
router.get('/:id', buscarCameraPorId);

module.exports = router;