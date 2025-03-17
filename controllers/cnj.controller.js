// controllers/cnj.controller.js
const cnjService = require('../services/cnj.service');

/**
 * Controlador para operações relacionadas ao CNJ
 */
class CNJController {
  /**
   * Obtém a lista de tribunais
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  getTribunais(req, res) {
    try {
      const inicio = Date.now();
      const tribunaisList = cnjService.getTribunais();
      
      res.json({
        success: true,
        tribunais: tribunaisList,
        tempo: Date.now() - inicio
      });
    } catch (error) {
      console.error('Erro ao obter lista de tribunais:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao processar a solicitação'
      });
    }
  }

  /**
   * Consulta um processo
   * @param {Request} req - Requisição Express
   * @param {Response} res - Resposta Express
   */
  async consultarProcesso(req, res) {
    try {
      const { numeroProcesso, tribunal } = req.body;
      
      if (!numeroProcesso || !tribunal) {
        return res.status(400).json({
          success: false,
          error: 'Número do processo e tribunal são obrigatórios'
        });
      }
      
      const resultado = await cnjService.consultarProcesso(numeroProcesso, tribunal);
      res.json(resultado);
      
    } catch (error) {
      console.error('Erro ao consultar processo:', error);
      
      // Se o erro foi tratado no serviço
      if (error.status && error.mensagem) {
        return res.status(error.status).json({
          success: false,
          error: error.mensagem,
          tempo: error.tempo
        });
      }
      
      // Erro genérico
      res.status(500).json({
        success: false,
        error: 'Erro ao processar a solicitação',
        mensagem: error.message
      });
    }
  }
}

module.exports = new CNJController();