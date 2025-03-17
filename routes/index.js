// routes/index.js
const express = require('express');
const router = express.Router();

// Importar rotas
const aiRoutes = require('./ai.routes');
const cnjRoutes = require('./cnj.routes');

// Definir prefixos para as rotas
router.use('/ai', aiRoutes);
router.use('/cnj', cnjRoutes);

module.exports = router;