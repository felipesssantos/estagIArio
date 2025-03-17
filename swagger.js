const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const packageJson = require('./package.json');

// Opções do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EstagIArio API',
      version: packageJson.version || '1.0.0',
      description: 'API do EstagIArio - Assistente Jurídico Inteligente',
      contact: {
        name: 'Suporte EstagIArio',
        email: 'suporte@estagIArio.com',
        url: 'https://www.estagIArio.com/suporte',
      },
      license: {
        name: 'Licenciado sob MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Servidor de desenvolvimento',
      },
      {
        url: 'https://api.estagIArio.com/api',
        description: 'Servidor de produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indica se a operação foi bem-sucedida',
            },
            message: {
              type: 'string',
              description: 'Mensagem descritiva',
            },
          },
        },
        TokenInfo: {
          type: 'object',
          properties: {
            prompt: {
              type: 'integer',
              description: 'Número de tokens utilizados na requisição',
            },
            completion: {
              type: 'integer',
              description: 'Número de tokens utilizados na resposta',
            },
            total: {
              type: 'integer',
              description: 'Total de tokens utilizados',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'AI',
        description: 'Endpoints para operações com Inteligência Artificial',
      },
      {
        name: 'CNJ',
        description: 'Endpoints para consulta de processos judiciais',
      },
    ],
  },
  apis: [
    path.resolve(__dirname, './routes/*.js'),
    path.resolve(__dirname, './controllers/*.js'),
    path.resolve(__dirname, './docs/*.js'),
  ],
};

// Gerar especificação Swagger
const swaggerSpec = swaggerJsDoc(swaggerOptions);

// Função para configurar o Swagger na aplicação
const setupSwagger = (app) => {
  // Configurações personalizadas para a UI do Swagger
  const swaggerUiOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'EstagIArio API',
    customfavIcon: '/favicon.ico',
    explorer: true,
  };

  // Rota para a UI do Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

  // Rota para obter o JSON da especificação Swagger (útil para ferramentas)
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('Documentação Swagger disponível em /api-docs');
};

module.exports = { setupSwagger, swaggerSpec };