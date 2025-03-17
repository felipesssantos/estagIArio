// config/config.js
require('dotenv').config(); // Use variáveis de ambiente para senhas e tokens

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Configurações OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    maxTokens: parseInt(process.env.MAX_TOKENS) || 8192
  },
  
  // Configurações CNJ
  cnj: {
    apiBaseUrl: 'https://api-publica.datajud.cnj.jus.br',
    apiKey: process.env.CNJ_API_KEY || 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
  },
  
  // Outras configurações
  cors: {
    origin: process.env.CORS_ORIGIN || '*'
  }
};