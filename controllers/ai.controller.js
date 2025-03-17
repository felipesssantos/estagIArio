// controllers/ai.controller.js
const openaiService = require('../services/openai.service');
const formidable = require('formidable');
const fs = require('fs');
const { createWorker } = require('tesseract.js');
const multer = require('multer');
const { DocumentService } = require('../services/document.service');

const path = require('path');

const form = new formidable.IncomingForm({
  keepExtensions: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  multiples: false,
});

// Configurar o multer para armazenar arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Garantir que o diretório de uploads existe
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

/**
 * Controlador para operações de IA
 */
class AIController {
  /**
   * Gera um resumo de processo
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async gerarResumo(req, res) {
    try {
      const { textoProcesso, opcoes } = req.body;
      
      if (!textoProcesso) {
        return res.status(400).json({
          success: false,
          error: 'Texto do processo é obrigatório'
        });
      }
      
      const resultado = await openaiService.gerarResumo(textoProcesso, opcoes || []);
      res.json(resultado);
      
    } catch (error) {
      console.error('Erro ao gerar resumo:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar a solicitação'
      });
    }
  }

  /**
   * Gera uma petição inicial
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async gerarPeticao(req, res) {
    try {
      const { tipoAcao, partesProcesso, fatos, pedidos } = req.body;
      
      if (!tipoAcao || !partesProcesso || !fatos || !pedidos) {
        return res.status(400).json({
          success: false,
          error: 'Todos os campos são obrigatórios'
        });
      }
      
      const resultado = await openaiService.gerarPeticao({
        tipoAcao,
        partesProcesso,
        fatos,
        pedidos
      });
      
      res.json(resultado);
      
    } catch (error) {
      console.error('Erro ao gerar petição:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar a solicitação'
      });
    }
  }

  /**
   * Realiza análise jurídica
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async realizarAnalise(req, res) {
    try {
      const { tipoAnalise, textoAnalise, perguntaEspecifica } = req.body;
      
      if (!tipoAnalise || !textoAnalise) {
        return res.status(400).json({
          success: false,
          error: 'Tipo de análise e texto são obrigatórios'
        });
      }
      
      const resultado = await openaiService.realizarAnalise({
        tipoAnalise,
        textoAnalise,
        perguntaEspecifica
      });
      
      res.json(resultado);
      
    } catch (error) {
      console.error('Erro ao realizar análise:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar a solicitação'
      });
    }
  }

  /**
   * Extrai texto de imagens ou PDFs
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async extrairTexto(req, res) {
    const { createWorker } = require('tesseract.js');
    let worker = null;
    
    try {
      const form = new formidable.IncomingForm({
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
      });
      
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('Erro ao processar o formulário:', err);
          return res.status(500).json({
            success: false,
            error: 'Erro ao processar o upload do arquivo'
          });
        }
        
        // Verificar se há arquivo na requisição
        const fileField = Object.keys(files).length > 0 ? Object.keys(files)[0] : null;
        if (!fileField || !files[fileField]) {
          return res.status(400).json({
            success: false,
            error: 'Nenhum arquivo enviado'
          });
        }
        
        const file = files[fileField];
        const startTime = Date.now();
        
        try {
          console.log('Tipo do arquivo:', file.mimetype);
          console.log('Caminho do arquivo:', file.filepath);
          
          // Criar o worker sem especificar um caminho de idioma
          worker = createWorker({
            logger: m => console.log(m)
          });
          
          // Inicializar o worker com português
          await worker.load();
          await worker.loadLanguage('por');
          await worker.initialize('por');
          
          // Extrair texto da imagem
          const { data } = await worker.recognize(file.filepath);
          console.log('Texto extraído:', data.text.substring(0, 100) + '...');
          
          // Opções de correção
          const corrigirErros = fields.corrigirErros === 'true';
          const manterFormatacao = fields.manterFormatacao === 'true';
          
          // Se solicitado correção, usar IA para melhorar o texto
          let resultado;
          if (corrigirErros && data && data.text) {
            resultado = await openaiService.corrigirTextoOCR(data.text, {
              corrigirErros,
              manterFormatacao
            });
          } else {
            // Sem correção, apenas retornar o texto extraído
            resultado = {
              resultado: data?.text || "Nenhum texto extraído",
              tempo: Date.now() - startTime
            };
          }
          
          // Finalizar o worker antes de responder
          await worker.terminate();
          worker = null;
          
          res.json(resultado);
          
        } catch (ocrError) {
          console.error('Erro na extração de texto:', ocrError);
          res.status(500).json({
            success: false,
            error: 'Erro ao extrair texto do arquivo',
            mensagem: ocrError.message
          });
        } finally {
          // Finalizar o worker se ainda existir
          if (worker) {
            try {
              await worker.terminate();
            } catch (e) {
              console.error('Erro ao finalizar worker:', e);
            }
          }
          
          // Limpar arquivo temporário
          if (file && file.filepath && fs.existsSync(file.filepath)) {
            try {
              fs.unlinkSync(file.filepath);
            } catch (e) {
              console.error('Erro ao remover arquivo temporário:', e);
            }
          }
        }
      });
    } catch (error) {
      console.error('Erro geral ao extrair texto:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar a solicitação'
      });
    }
  }

  /**
 * Extrai texto de documentos (PDF/imagens)
 * @param {Request} req - Requisição Express
 * @param {Response} res - Resposta Express
 */
async extrairTexto(req, res) {
  try {
    // Multer já processou o arquivo
    const file = req.file;
    const { corrigirErros, manterFormatacao } = req.body;
    
    if (!file) {
      return res.status(400).json({ 
        success: false,
        error: 'Nenhum arquivo foi enviado' 
      });
    }
    
    // Extrair texto usando o serviço de documento
    const resultado = await DocumentService.extrairTexto(file, {
      corrigirErros: corrigirErros === 'true',
      manterFormatacao: manterFormatacao === 'true'
    });
    
    // Excluir o arquivo após o processamento
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    res.json(resultado);
    
  } catch (error) {
    console.error('Erro ao extrair texto:', error);
    
    // Melhorar as mensagens de erro
    if (error.message && error.message.includes('Invalid MIME type')) {
      res.status(400).json({ 
        success: false,
        error: 'Formato de arquivo não suportado. Por favor, utilize formatos de imagem (JPG, PNG, WEBP) ou PDFs.' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: error.message || 'Erro ao processar a solicitação' 
      });
    }
    
    // Tentar limpar o arquivo se existir
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
}
}

module.exports = new AIController();