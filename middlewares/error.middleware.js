// middlewares/error.middleware.js

/**
 * Middleware para tratamento centralizado de erros
 */
function errorHandler(err, req, res, next) {
    console.error('Erro não tratado:', err);
    
    // Se já enviou resposta, passa para o próximo
    if (res.headersSent) {
      return next(err);
    }
    
    // Status do erro (usa 500 como padrão)
    const status = err.status || 500;
    
    // Mensagem de erro (mais genérica em produção)
    const message = process.env.NODE_ENV === 'production' && status === 500
      ? 'Erro interno do servidor'
      : err.message || 'Ocorreu um erro ao processar a requisição';
    
    // Detalhes adicionais (apenas em ambiente de desenvolvimento)
    const details = process.env.NODE_ENV !== 'production' ? err.stack : undefined;
    
    res.status(status).json({
      success: false,
      error: message,
      details
    });
  }
  
  module.exports = errorHandler;