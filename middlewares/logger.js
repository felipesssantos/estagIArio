const winston = require('winston');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');
const { ptBR } = require('date-fns/locale');

// Criar diretório de logs se não existir
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Configuração do winston logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
        }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: 'estagIArio-api' },
    transports: [
        // Console logs para desenvolvimento
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                    info => `${info.timestamp} ${info.level}: ${info.message} ${info.stack || ''}`
                )
            ),
            level: process.env.NODE_ENV === 'production' ? 'error' : 'debug'
        }),
        
        // Arquivo de logs para todas as mensagens
        new winston.transports.File({
            filename: path.join(logDir, 'all.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        
        // Arquivo separado só para erros
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),

        //Arquivo separado para logs do ChatGPT
        new winston.transports.File({
            filename: path.join(logDir, 'chatgpt.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 10,
            tailable: true,
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: () => format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
                }),
                winston.format.json()
            )
        })
    ]
});

// Criar logger específico para ChatGPT
const chatGptLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
        }),
        winston.format.json()
    ),
    defaultMeta: { service: 'chatgpt-api' },
    transports: [
        new winston.transports.File({
            filename: path.join(logDir, 'chatgpt_detailed.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 20,
            tailable: true
        }),
        // Também enviar para o console em ambiente de desenvolvimento
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(
                    info => `${info.timestamp} ${info.level}: [ChatGPT] ${info.message}`
                )
            ),
            level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
        })
    ]
});

// Formato personalizado para o Morgan
const morganFormat = (tokens, req, res) => {
    // Criar ID único para a requisição
    const requestId = req.id || tokens['request-id'](req) || `req-${Math.random().toString(36).substring(2, 10)}`;
    
    // Capturar corpo da requisição (com limites para não logar dados sensíveis/grandes)
    let bodyString = '';
    if (req.body && Object.keys(req.body).length > 0) {
        // Não logar senha ou outros campos sensíveis
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.senha) sanitizedBody.senha = '********';
        if (sanitizedBody.password) sanitizedBody.password = '********';
        
        // Limitar tamanho do corpo logado
        bodyString = JSON.stringify(sanitizedBody);
        if (bodyString.length > 1000) {
            bodyString = bodyString.substring(0, 997) + '...';
        }
    }
    
    // Capturar parâmetros da consulta
    const queryString = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : '';
    
    // Calcular tempo de resposta
    const responseTime = tokens['response-time'](req, res);
    
    // Formatar a mensagem de log
    return {
        timestamp: tokens.date(req, res, 'iso'),
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: parseInt(tokens.status(req, res)),
        responseTime: responseTime ? `${responseTime}ms` : undefined,
        contentLength: tokens.res(req, res, 'content-length'),
        requestId: requestId,
        remoteAddress: tokens['remote-addr'](req, res),
        userAgent: req.headers['user-agent'],
        query: queryString || undefined,
        body: bodyString || undefined,
        referrer: req.headers.referer || req.headers.referrer,
        route: req.route ? req.route.path : undefined
    };
};

// Middleware de log para requisições HTTP
const httpLogger = morgan(
    (tokens, req, res) => {
        const logInfo = morganFormat(tokens, req, res);
        
        // Nível de log baseado no status da resposta
        const status = logInfo.status;
        
        if (status >= 500) {
            logger.error('HTTP Request Error', logInfo);
        } else if (status >= 400) {
            logger.warn('HTTP Request Warning', logInfo);
        } else {
            logger.info('HTTP Request', logInfo);
        }
        
        return null; // Não produzir saída pelo morgan, apenas usar o winston
    },
    {
        // Opções do morgan
        stream: {
            write: (message) => {
                // Esta função não será chamada, pois retornamos null acima
                // É apenas um requisito do morgan
            }
        }
    }
);

// Middleware para adicionar ID único a cada requisição
const requestIdMiddleware = (req, res, next) => {
    req.id = `req-${Math.random().toString(36).substring(2, 10)}`;
    next();
};

// Middleware para medir o tempo de execução da requisição
const requestTimeMiddleware = (req, res, next) => {
    req.startTime = Date.now();
    
    // Interceptar método de envio para logar ao finalizar
    const originalSend = res.send;
    res.send = function(body) {
        res.responseBody = body;
        return originalSend.apply(res, arguments);
    };
    
    // Monitorar finalização da requisição
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        
        // Registrar métricas detalhadas apenas se for requisição de API
        if (req.path.startsWith('/api/')) {
            // Adicionar informações sobre a API específica
            const apiPath = req.path.split('/api/')[1];
            const [apiCategory, apiEndpoint] = apiPath.split('/');
            
            const metricData = {
                requestId: req.id,
                duration,
                endpoint: req.path,
                method: req.method,
                statusCode: res.statusCode,
                apiCategory: apiCategory || 'unknown',
                apiEndpoint: apiEndpoint || 'root',
                userAgent: req.headers['user-agent'],
                contentType: req.headers['content-type'],
                responseSize: res.getHeader('Content-Length') || 'unknown'
            };
            
            // Se for uma operação específica (AI, CNJ, etc), registrar em logs separados
            if (apiCategory === 'ai') {
                logger.log(level, `AI API Call: ${req.method} ${req.path}`, metricData);
            } else if (apiCategory === 'cnj') {
                logger.log(level, `CNJ API Call: ${req.method} ${req.path}`, metricData);
            } else {
                logger.log(level, `API Call: ${req.method} ${req.path}`, metricData);
            }
            
            // Registrar tempo de execução para monitoramento de performance
            if (duration > 1000) {  // Log requisições lentas (> 1s)
                logger.warn(`Slow API Request: ${req.method} ${req.path} took ${duration}ms`, {
                    ...metricData,
                    threshold: '1000ms'
                });
            }
        }
    });
    
    next();
};

// Middleware específico para logar requisições do ChatGPT
const logChatGptRequest = (req, res, next) => {
    // Se não for uma chamada ao ChatGPT, pular
    const isChatGptRequest = 
        req.path.includes('/api/ai/') || 
        req.path.includes('/openai') || 
        req.path.includes('/chatgpt') ||
        (req.headers['x-api-type'] === 'ai');
    
    if (!isChatGptRequest) {
        return next();
    }
    
    // Capturar o corpo da requisição
    const requestStartTime = Date.now();
    let requestBody = null;
    
    try {
        // Fazer uma cópia segura do corpo da requisição
        // Removendo ou mascarando dados sensíveis
        requestBody = JSON.parse(JSON.stringify(req.body));
        
        // Limitar o tamanho do texto de entrada para o log
        if (requestBody.textoProcesso && requestBody.textoProcesso.length > 500) {
            requestBody.textoProcesso = `${requestBody.textoProcesso.substring(0, 500)}... [truncado]`;
        }
        
        if (requestBody.textoAnalise && requestBody.textoAnalise.length > 500) {
            requestBody.textoAnalise = `${requestBody.textoAnalise.substring(0, 500)}... [truncado]`;
        }
        
        if (requestBody.fatos && requestBody.fatos.length > 500) {
            requestBody.fatos = `${requestBody.fatos.substring(0, 500)}... [truncado]`;
        }
        
        // Remover qualquer campo que possa conter chaves de API
        if (requestBody.apiKey) requestBody.apiKey = "[REMOVIDO]";
        if (requestBody.key) requestBody.key = "[REMOVIDO]";
    } catch (error) {
        requestBody = { error: "Não foi possível capturar o corpo da requisição" };
    }
    
    // Capturar resposta
    const originalSend = res.send;
    res.send = function(body) {
        res.responseBody = body;
        
        // Processar a resposta apenas se for um objeto JSON
        try {
            let responseData = typeof body === 'string' ? JSON.parse(body) : body;
            let responseSize = 0;
            
            // Medir o tamanho da resposta
            if (typeof body === 'string') {
                responseSize = body.length;
            } else {
                responseSize = JSON.stringify(body).length;
            }
            
            // Extrair tokens se disponíveis
            const tokens = responseData.tokens || {};
            const promptTokens = tokens.prompt || 0;
            const completionTokens = tokens.completion || 0;
            const totalTokens = tokens.total || (promptTokens + completionTokens);
            
            // Calcular tempo de resposta
            const responseTime = Date.now() - requestStartTime;
            
            // Calcular custo estimado (se quiser rastrear isso)
            // Valores de exemplo para GPT-3.5-turbo, ajuste conforme seu modelo
            const promptCostPer1K = 0.0015; // $0.0015 por 1K tokens
            const completionCostPer1K = 0.002; // $0.002 por 1K tokens
            const estimatedCost = (
                (promptTokens / 1000) * promptCostPer1K + 
                (completionTokens / 1000) * completionCostPer1K
            ).toFixed(6);
            
            // Identificar o tipo de operação
            const operationType = getOperationType(req.path);
            
            // Criar log detalhado
            chatGptLogger.info(`ChatGPT API - ${operationType}`, {
                type: operationType,
                endpoint: req.path,
                method: req.method,
                requestId: req.id || `req-${Math.random().toString(36).substring(2, 10)}`,
                userId: req.user?.id || 'anonymous',
                requestSize: JSON.stringify(requestBody).length,
                responseSize: responseSize,
                responseTime: responseTime,
                tokens: {
                    prompt: promptTokens,
                    completion: completionTokens,
                    total: totalTokens
                },
                cost: {
                    estimated: estimatedCost,
                    currency: 'USD'
                },
                statusCode: res.statusCode,
                timestamp: new Date().toISOString(),
                requestParams: req.query,
                requestBody: requestBody,
                // Não log a resposta completa para economizar espaço, apenas metadados
                responseMetadata: {
                    hasError: !!responseData.error,
                    tokens: responseData.tokens,
                    model: responseData.model,
                    time: responseData.tempo
                }
            });
            
            // Para fins de monitoramento de performance, log requisições lentas
            if (responseTime > 20000) { // mais de 5 segundos
                logger.warn(`ChatGPT API - Requisição lenta (${responseTime}ms)`, {
                    endpoint: req.path,
                    model: responseData.model,
                    tokens: totalTokens,
                    responseTime: responseTime,
                    operationType: operationType
                });
            }
        } catch (error) {
            chatGptLogger.error(`Erro ao processar log do ChatGPT`, {
                error: error.message,
                stack: error.stack,
                endpoint: req.path
            });
        }
        
        return originalSend.apply(res, arguments);
    };
    
    next();
};

// Função para identificar o tipo de operação
function getOperationType(path) {
    if (path.includes('/resumo')) return 'RESUMO';
    if (path.includes('/peticao')) return 'PETICAO';
    if (path.includes('/analise')) return 'ANALISE_JURIDICA';
    if (path.includes('/extracao')) return 'EXTRACAO_TEXTO';
    if (path.includes('/completion')) return 'COMPLETION';
    if (path.includes('/chat')) return 'CHAT';
    return 'OUTROS';
}


// Middleware para logar erros
const errorLoggerMiddleware = (err, req, res, next) => {
    logger.error('Application Error', {
        error: {
            message: err.message,
            stack: err.stack,
            name: err.name,
            code: err.code
        },
        request: {
            id: req.id,
            method: req.method,
            url: req.originalUrl,
            query: req.query,
            body: req.body,
            user: req.user ? (req.user.id || req.user._id) : undefined,
            ip: req.ip
        }
    });
    
    next(err);
};

// Exportar os middlewares
module.exports = {
    logger,
    chatGptLogger,
    httpLogger,
    requestIdMiddleware,
    requestTimeMiddleware,
    errorLoggerMiddleware,
    logChatGptRequest
};