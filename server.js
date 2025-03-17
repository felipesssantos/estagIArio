const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config/config');
const routes = require('./routes');
const errorHandler = require('./middlewares/error.middleware');
const { setupSwagger } = require('./swagger');
const { setupMonitoring } = require('./middlewares/monitoring');

// Inicializar Express
const app = express();
const PORT = config.port;

const { 
    logger, 
    chatGptLogger,
    httpLogger, 
    requestIdMiddleware, 
    requestTimeMiddleware, 
    errorLoggerMiddleware,
    logChatGptRequest 
} = require('./middlewares/logger');

// Aplicar os middlewares de log - importante a ordem
app.use(requestIdMiddleware);
app.use(requestTimeMiddleware);
app.use(httpLogger);

// Configurar middlewares
app.use(requestIdMiddleware);
app.use(express.json()); // É importante que este esteja ANTES do logChatGptRequest
app.use(express.urlencoded({ extended: true }));
app.use(requestTimeMiddleware);
app.use(logChatGptRequest); // Middleware específico para ChatGPT
app.use(httpLogger);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configurar Swagger
setupSwagger(app);

// IMPORTANTE: Configurar sistema de monitoramento ANTES das rotas
setupMonitoring(app);

// Aplicar rotas API
app.use('/api', routes);

// Rota para a página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware para lidar com rotas não encontradas
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada'
  });
});

// Middleware para tratamento centralizado de erros
app.use(errorHandler);

// Middleware de erro 
app.use(errorLoggerMiddleware);

// Iniciar o servidor
app.listen(PORT, () => {
  logger.info(`Servidor iniciado na porta ${PORT}`);  
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Ambiente: ${config.nodeEnv}`);
  console.log(`URL: http://localhost:${PORT}`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', reason);
});