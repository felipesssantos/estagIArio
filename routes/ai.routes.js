// routes/ai.routes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const multer = require('multer');

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: function (req, file, cb) {
    // Verificar tipos de arquivo permitidos
    if (file.mimetype === 'application/pdf' || 
        file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo não suportado. Por favor, utilize formatos de imagem (JPG, PNG, WEBP) ou PDFs.'));
    }
  }
});

// Garantir que o diretório de uploads existe
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Rotas para funcionalidades de IA
router.post('/resumo', aiController.gerarResumo);
router.post('/peticao', aiController.gerarPeticao);
router.post('/analise', aiController.realizarAnalise);

// Rota para extração de texto - usando multer para upload do arquivo
router.post('/extracao', upload.single('arquivo'), aiController.extrairTexto);

module.exports = router;