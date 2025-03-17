// routes/cnj.routes.js
const express = require('express');
const router = express.Router();
const cnjController = require('../controllers/cnj.controller');

// Rota para obter lista de tribunais
router.get('/tribunais', cnjController.getTribunais);

// Rota para consultar processo
router.post('/consultar', cnjController.consultarProcesso);

module.exports = router;