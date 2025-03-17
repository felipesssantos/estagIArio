const promBundle = require('express-prom-bundle');
const client = require('prom-client');
const { logger } = require('./logger');

// Configuração das métricas personalizadas
const setupMonitoring = (app) => {
  // Crie um novo registro (registry) do Prometheus
  const register = new client.Registry();
  
  // Coletar métricas padrão com configuração correta
  client.collectDefaultMetrics({ 
    register,
    timeout: 5000 // 5 segundos
  });
  
  // Configurações do Prometheus Bundle
  const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    includeUp: true,
    customLabels: { app: 'estagIArio-api' },
    metricsPath: '/metrics',
    httpDurationMetricName: 'http_request_duration_seconds',
    promRegistry: register, // Usar o registro criado
  });

  // Contador de requisições da API de IA
  const aiRequestCounter = new client.Counter({
    name: 'ai_api_requests_total',
    help: 'Contador de requisições para a API de IA',
    labelNames: ['endpoint', 'status'],
    registers: [register]
  });

  // Histograma para tempos de resposta da API de IA
  const aiResponseTimeHistogram = new client.Histogram({
    name: 'ai_api_response_time_seconds',
    help: 'Tempo de resposta das requisições para a API de IA',
    labelNames: ['endpoint'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // em segundos
    registers: [register]
  });

  // Contador para tokens consumidos pela API de IA
  const aiTokensCounter = new client.Counter({
    name: 'ai_api_tokens_total',
    help: 'Total de tokens consumidos pela API de IA',
    labelNames: ['endpoint', 'type'], // type: prompt, completion, total
    registers: [register]
  });

  // Contador de requisições ao CNJ
  const cnjRequestCounter = new client.Counter({
    name: 'cnj_api_requests_total',
    help: 'Contador de requisições para a API do CNJ',
    labelNames: ['tribunal', 'status'],
    registers: [register]
  });

  // Histograma para tempos de resposta do CNJ
  const cnjResponseTimeHistogram = new client.Histogram({
    name: 'cnj_api_response_time_seconds',
    help: 'Tempo de resposta das requisições para a API do CNJ',
    labelNames: ['tribunal'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60], // em segundos
    registers: [register]
  });

  // Gauge para sessões ativas
  const activeSessionsGauge = new client.Gauge({
    name: 'active_sessions',
    help: 'Número de sessões ativas',
    registers: [register]
  });

  // Middleware para registrar métricas de IA
  const aiMetricsMiddleware = (req, res, next) => {
    // AJUSTADO: Verificar se é uma requisição para a API de IA com o prefixo /api
    if (req.path.includes('/api/ai/')) {
      console.log('[Metrics] ✓ Detectada requisição para API de IA:', req.path);
      
      // Extrair o endpoint - pegar a parte após "/api/ai/"
      const parts = req.path.split('/api/ai/');
      const endpoint = parts.length > 1 ? parts[1].split('/')[0] : 'geral';
      console.log('[Metrics] Endpoint identificado:', endpoint);
      
      const startTime = process.hrtime();

      // Interceptar método de envio para capturar tokens e tempo
      const originalSend = res.send;
      res.send = function (body) {
        // Calcular tempo de resposta
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const responseTimeInSeconds = seconds + nanoseconds / 1e9;

        console.log(`[Metrics] Tempo de resposta da API de IA (${endpoint}): ${responseTimeInSeconds.toFixed(3)}s`);

        // Contabilizar requisição
        aiRequestCounter.inc({ endpoint, status: res.statusCode });
        console.log(`[Metrics] Incrementando contador de requisições: endpoint=${endpoint}, status=${res.statusCode}`);

        // Registrar tempo de resposta
        aiResponseTimeHistogram.observe({ endpoint }, responseTimeInSeconds);

        try {
          // Tentar extrair informações de tokens
          const data = typeof body === 'string' ? JSON.parse(body) : body;
          console.log('[Metrics] Analisando resposta para métricas de tokens:', data ? 'Dados encontrados' : 'Sem dados');
          
          // Tentar diferentes caminhos onde os tokens podem estar
          const tokens = data?.tokens || data?.resultado?.tokens || data?.estatisticas?.tokens;
          
          if (tokens) {
            console.log('[Metrics] Tokens encontrados:', tokens);
            // Registrar tokens
            if (tokens.prompt) {
              aiTokensCounter.inc({ endpoint, type: 'prompt' }, tokens.prompt);
              console.log(`[Metrics] Tokens de prompt: ${tokens.prompt}`);
            }
            if (tokens.completion) {
              aiTokensCounter.inc({ endpoint, type: 'completion' }, tokens.completion);
              console.log(`[Metrics] Tokens de completion: ${tokens.completion}`);
            }
            if (tokens.total) {
              aiTokensCounter.inc({ endpoint, type: 'total' }, tokens.total);
              console.log(`[Metrics] Tokens totais: ${tokens.total}`);
            }
          } else {
            console.log('[Metrics] Nenhuma informação de tokens encontrada na resposta');
          }
        } catch (error) {
          console.error('[Metrics] Erro ao processar métricas de tokens:', error.message);
          logger.error('Erro ao processar métricas de tokens', {
            error: error.message,
            path: req.path,
          });
        }

        return originalSend.apply(res, arguments);
      };
    }
    next();
  };

  // Middleware para registrar métricas do CNJ
  const cnjMetricsMiddleware = (req, res, next) => {
    // AJUSTADO: Verificar se é uma requisição para a API do CNJ com o prefixo /api
    if (req.path.includes('/api/cnj/')) {
      console.log('[Metrics] ✓ Detectada requisição para API do CNJ:', req.path);
      
      const startTime = process.hrtime();
      let tribunal = req.body?.tribunal || 'unknown';
      console.log('[Metrics] Tribunal identificado:', tribunal);

      // Interceptar método de envio para capturar tempo
      const originalSend = res.send;
      res.send = function (body) {
        // Calcular tempo de resposta
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const responseTimeInSeconds = seconds + nanoseconds / 1e9;

        console.log(`[Metrics] Tempo de resposta da API do CNJ (${tribunal}): ${responseTimeInSeconds.toFixed(3)}s`);

        // Contabilizar requisição
        cnjRequestCounter.inc({ tribunal, status: res.statusCode });
        console.log(`[Metrics] Incrementando contador de requisições CNJ: tribunal=${tribunal}, status=${res.statusCode}`);

        // Registrar tempo de resposta
        cnjResponseTimeHistogram.observe({ tribunal }, responseTimeInSeconds);

        return originalSend.apply(res, arguments);
      };
    }
    next();
  };

  // Middleware para rastrear sessões ativas
  const sessionTrackerMiddleware = (req, res, next) => {
    // AJUSTADO: Caminhos para login/logout - com o prefixo /api
    if (req.path.includes('/api/auth/login') && req.method === 'POST') {
      console.log('[Metrics] Detectada tentativa de login');
      
      const originalSend = res.send;
      res.send = function (body) {
        if (res.statusCode === 200) {
          activeSessionsGauge.inc();
          console.log('[Metrics] Login bem-sucedido, incrementando contador de sessões ativas');
        }
        return originalSend.apply(res, arguments);
      };
    }

    if (req.path.includes('/api/auth/logout') && req.method === 'POST') {
      activeSessionsGauge.dec();
      console.log('[Metrics] Logout, decrementando contador de sessões ativas');
    }

    next();
  };

  // Aplicar middleware do Prometheus para métricas HTTP gerais
  app.use(metricsMiddleware);

  // Aplicar nossos middlewares personalizados
  app.use(sessionTrackerMiddleware);
  app.use(aiMetricsMiddleware);
  app.use(cnjMetricsMiddleware);

  // Rota para métricas do Prometheus
  app.get('/metrics', async (req, res) => {
    try {
      console.log('[Metrics] Gerando métricas em formato Prometheus');
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      logger.error('Erro ao gerar métricas:', error);
      res.status(500).send('Erro ao gerar métricas');
    }
  });

  // Endpoint para verificação de saúde da aplicação
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: Date.now(),
      memory: process.memoryUsage(),
    });
  });

  // Dashboard para visualizar métricas
  app.get('/admin/dashboard', (req, res) => {
    // Esta rota deve ser protegida por autenticação em produção
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EstagIArio API - Dashboard</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <style>
            body { 
              padding: 20px; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .metric-card { 
              margin-bottom: 20px; 
              border-radius: 10px;
              box-shadow: 0 4px 8px rgba(0,0,0,0.05);
              transition: all 0.3s;
            }
            .metric-card:hover {
              box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            }
            .card-title {
              color: #555;
              font-weight: 600;
            }
            h1 {
              color: #333;
              margin-bottom: 1.5rem;
              border-bottom: 2px solid #eee;
              padding-bottom: 10px;
            }
            h2 {
              font-size: 2.2rem;
              font-weight: 700;
              margin: 0;
              color: #333;
            }
            .nav-tabs .nav-link {
              border: none;
              color: #888;
              font-weight: 500;
            }
            .nav-tabs .nav-link.active {
              border-bottom: 3px solid #00b2d6;
              color: #333;
              font-weight: 600;
            }
            .tab-content {
              padding-top: 1.5rem;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="mb-4">EstagIArio API - Dashboard</h1>
            
            <ul class="nav nav-tabs mb-4" id="dashboardTabs" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="ia-tab" data-bs-toggle="tab" data-bs-target="#ia" type="button" role="tab" aria-controls="ia" aria-selected="true">
                  API de IA
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="cnj-tab" data-bs-toggle="tab" data-bs-target="#cnj" type="button" role="tab" aria-controls="cnj" aria-selected="false">
                  API do CNJ
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="sistema-tab" data-bs-toggle="tab" data-bs-target="#sistema" type="button" role="tab" aria-controls="sistema" aria-selected="false">
                  Métricas do Sistema
                </button>
              </li>
            </ul>
            
            <div class="tab-content" id="dashboardTabsContent">
              <!-- Tab de IA -->
              <div class="tab-pane fade show active" id="ia" role="tabpanel" aria-labelledby="ia-tab">
                <div class="row">
                  <div class="col-md-4">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Requisições IA</h5>
                        <h2 id="ai-requests">Carregando...</h2>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-4">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Tokens Consumidos</h5>
                        <h2 id="ai-tokens">Carregando...</h2>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-4">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Tempo Médio (IA)</h5>
                        <h2 id="ai-time">Carregando...</h2>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="row mt-4">
                  <div class="col-md-6">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Requisições por Endpoint</h5>
                        <canvas id="endpoint-chart"></canvas>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-6">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Distribuição de Tempo de Resposta</h5>
                        <canvas id="response-time-chart"></canvas>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Tab CNJ -->
              <div class="tab-pane fade" id="cnj" role="tabpanel" aria-labelledby="cnj-tab">
                <div class="row">
                  <div class="col-md-4">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Requisições CNJ</h5>
                        <h2 id="cnj-requests">Carregando...</h2>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-4">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Sucesso (%)</h5>
                        <h2 id="cnj-success-rate">Carregando...</h2>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-4">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Tempo Médio (CNJ)</h5>
                        <h2 id="cnj-time">Carregando...</h2>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="row mt-4">
                  <div class="col-md-6">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Requisições por Tribunal</h5>
                        <canvas id="tribunal-chart"></canvas>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-6">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Tempos de Resposta por Tribunal (s)</h5>
                        <canvas id="tribunal-time-chart"></canvas>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Tab Sistema -->
              <div class="tab-pane fade" id="sistema" role="tabpanel" aria-labelledby="sistema-tab">
                <div class="row">
                  <div class="col-md-4">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Uso de CPU</h5>
                        <h2 id="cpu-usage">Carregando...</h2>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-4">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Uso de Memória</h5>
                        <h2 id="memory-usage">Carregando...</h2>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-4">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Tempo de Atividade</h5>
                        <h2 id="uptime">Carregando...</h2>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="row mt-4">
                  <div class="col-md-12">
                    <div class="card metric-card">
                      <div class="card-body">
                        <h5 class="card-title">Métricas Detalhadas</h5>
                        <p>Para visualizar todas as métricas em formato bruto, acesse <a href="/metrics" target="_blank">/metrics</a>.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
          <script>
            // Função para carregar dados das métricas
            async function loadMetrics() {
              try {
                const response = await fetch('/metrics');
                const data = await response.text();
                
                // Processar dados das métricas
                const lines = data.split('\\n');
                
                // Dados para API de IA
                let aiRequests = 0;
                let aiTokens = 0;
                let aiTime = 0;
                
                const endpointData = {
                  labels: [],
                  values: []
                };
                
                const responseTimeData = {
                  labels: ['0-0.1s', '0.1-0.5s', '0.5-1s', '1-2s', '2-5s', '5-10s', '10-30s', '30s+'],
                  values: [0, 0, 0, 0, 0, 0, 0, 0]
                };
                
                // Dados para API do CNJ
                let cnjRequests = 0;
                let cnjSuccessCount = 0;
                let cnjFailCount = 0;
                let cnjTime = 0;
                
                const tribunalData = {
                  labels: [],
                  values: []
                };
                
                const tribunalTimeData = {
                  labels: [],
                  values: []
                };
                
                // Dados do sistema
                let cpuUserTime = 0;
                let cpuSystemTime = 0;
                let memoryUsed = 0;
                let memoryTotal = 0;
                let startTime = 0;
                
                lines.forEach(line => {
                  // Ignorar linhas de comentário e vazias
                  if (line.startsWith('#') || line.trim() === '') return;
                  
                  // API de IA - Total de requisições
                  if (line.startsWith('ai_api_requests_total{')) {
                    const match = line.match(/ai_api_requests_total{.*?} (\\d+)/);
                    if (match) {
                      aiRequests += parseInt(match[1]);
                      
                      // Coletar dados por endpoint
                      const endpointMatch = line.match(/endpoint="([^"]+)"/);
                      const countMatch = line.match(/} (\\d+)/);
                      if (endpointMatch && countMatch) {
                        const endpoint = endpointMatch[1];
                        const count = parseInt(countMatch[1]);
                        
                        const index = endpointData.labels.indexOf(endpoint);
                        if (index === -1) {
                          endpointData.labels.push(endpoint);
                          endpointData.values.push(count);
                        } else {
                          endpointData.values[index] += count;
                        }
                      }
                    }
                  }
                  
                  // API de IA - Total de tokens
                  if (line.startsWith('ai_api_tokens_total{') && line.includes('type="total"')) {
                    const match = line.match(/ai_api_tokens_total{.*?} (\\d+)/);
                    if (match) {
                      aiTokens += parseInt(match[1]);
                    }
                  }
                  
                  // API de IA - Tempo médio
                  if (line.startsWith('ai_api_response_time_seconds_sum')) {
                    const sumMatch = line.match(/ai_api_response_time_seconds_sum{.*?} ([\\d\\.]+)/);
                    if (sumMatch) {
                      const sum = parseFloat(sumMatch[1]);
                      // Buscar a linha correspondente para o count
                      const endpointMatch = line.match(/endpoint="([^"]+)"/);
                      if (endpointMatch) {
                        const endpoint = endpointMatch[1];
                        const countLine = lines.find(l => 
                          l.startsWith('ai_api_response_time_seconds_count') && 
                          l.includes('endpoint="' + endpoint + '"'));
                        
                        const countMatch = countLine ? countLine.match(/ai_api_response_time_seconds_count{.*?} (\\d+)/) : null;
                        
                        if (countMatch) {
                          const count = parseInt(countMatch[1]);
                          if (count > 0) {
                            aiTime = (sum / count).toFixed(2);
                          }
                        }
                      }
                    }
                  }
                  
                  // API de IA - Distribuição de tempo
                  const bucketMatch = line.match(/ai_api_response_time_seconds_bucket{.*?le="([^"]+)".*?} (\\d+)/);
                  if (bucketMatch) {
                    const bucket = parseFloat(bucketMatch[1]);
                    const count = parseInt(bucketMatch[2]);
                    
                    if (bucket <= 0.1) responseTimeData.values[0] = count;
                    else if (bucket <= 0.5) responseTimeData.values[1] = count - responseTimeData.values[0];
                    else if (bucket <= 1) responseTimeData.values[2] = count - responseTimeData.values[0] - responseTimeData.values[1];
                    else if (bucket <= 2) responseTimeData.values[3] = count - responseTimeData.values[0] - responseTimeData.values[1] - responseTimeData.values[2];
                    else if (bucket <= 5) responseTimeData.values[4] = count - responseTimeData.values[0] - responseTimeData.values[1] - responseTimeData.values[2] - responseTimeData.values[3];
                    else if (bucket <= 10) responseTimeData.values[5] = count - responseTimeData.values[0] - responseTimeData.values[1] - responseTimeData.values[2] - responseTimeData.values[3] - responseTimeData.values[4];
                    else if (bucket <= 30) responseTimeData.values[6] = count - responseTimeData.values[0] - responseTimeData.values[1] - responseTimeData.values[2] - responseTimeData.values[3] - responseTimeData.values[4] - responseTimeData.values[5];
                    else responseTimeData.values[7] = count - responseTimeData.values[0] - responseTimeData.values[1] - responseTimeData.values[2] - responseTimeData.values[3] - responseTimeData.values[4] - responseTimeData.values[5] - responseTimeData.values[6];
                  }
                  
                  // API do CNJ - Total de requisições
                  if (line.startsWith('cnj_api_requests_total{')) {
                    const match = line.match(/cnj_api_requests_total{.*?} (\\d+)/);
                    if (match) {
                      const count = parseInt(match[1]);
                      cnjRequests += count;
                      
                      // Verificar se é sucesso ou falha
                      const statusMatch = line.match(/status="(\\d+)"/);
                      if (statusMatch) {
                        const status = parseInt(statusMatch[1]);
                        if (status >= 200 && status < 300) {
                          cnjSuccessCount += count;
                        } else {
                          cnjFailCount += count;
                        }
                      }
                      
                      // Coletar dados por tribunal
                      const tribunalMatch = line.match(/tribunal="([^"]+)"/);
                      if (tribunalMatch && match) {
                        const tribunal = tribunalMatch[1];
                        const count = parseInt(match[1]);
                        
                        const index = tribunalData.labels.indexOf(tribunal);
                        if (index === -1) {
                          tribunalData.labels.push(tribunal);
                          tribunalData.values.push(count);
                        } else {
                          tribunalData.values[index] += count;
                        }
                      }
                    }
                  }
                  
                  // API do CNJ - Tempo médio
                  if (line.startsWith('cnj_api_response_time_seconds_sum')) {
                    const sumMatch = line.match(/cnj_api_response_time_seconds_sum{.*?} ([\\d\\.]+)/);
                    if (sumMatch) {
                      const sum = parseFloat(sumMatch[1]);
                      
                      // Buscar a linha para o tribunal e tempo correspondente
                      const tribunalMatch = line.match(/tribunal="([^"]+)"/);
                      if (tribunalMatch) {
                        const tribunal = tribunalMatch[1];
                        
                        // Adicionar ao gráfico de tempo por tribunal
                        const index = tribunalTimeData.labels.indexOf(tribunal);
                        if (index === -1) {
                          // Buscar count para calcular tempo médio
                          const countLine = lines.find(l => 
                            l.startsWith('cnj_api_response_time_seconds_count') && 
                            l.includes('tribunal="' + tribunal + '"'));
                            
                          const countMatch = countLine ? countLine.match(/cnj_api_response_time_seconds_count{.*?} (\\d+)/) : null;
                          
                          if (countMatch) {
                            const count = parseInt(countMatch[1]);
                            if (count > 0) {
                              const avgTime = (sum / count).toFixed(2);
                              tribunalTimeData.labels.push(tribunal);
                              tribunalTimeData.values.push(avgTime);
                            }
                          }
                        }
                      }
                      
                      // Buscar o count total para todas as requisições CNJ
                      const countLine = lines.find(l => l.startsWith('cnj_api_response_time_seconds_count'));
                      const countMatch = countLine ? countLine.match(/cnj_api_response_time_seconds_count{.*?} (\\d+)/) : null;
                      
                      if (countMatch) {
                        const count = parseInt(countMatch[1]);
                        if (count > 0) {
                          cnjTime = (sum / count).toFixed(2);
                        }
                      }
                    }
                  }
                  
                  // Dados do sistema
                  if (line.startsWith('process_cpu_user_seconds_total')) {
                    const match = line.match(/process_cpu_user_seconds_total (\\d+\\.\\d+)/);
                    if (match) {
                      cpuUserTime = parseFloat(match[1]);
                    }
                  }
                  
                  if (line.startsWith('process_cpu_system_seconds_total')) {
                    const match = line.match(/process_cpu_system_seconds_total (\\d+\\.\\d+)/);
                    if (match) {
                      cpuSystemTime = parseFloat(match[1]);
                    }
                  }
                  
                  if (line.startsWith('process_resident_memory_bytes')) {
                    const match = line.match(/process_resident_memory_bytes (\\d+)/);
                    if (match) {
                      memoryUsed = parseInt(match[1]);
                    }
                  }
                  
                  if (line.startsWith('process_start_time_seconds')) {
                    const match = line.match(/process_start_time_seconds (\\d+)/);
                    if (match) {
                      startTime = parseInt(match[1]);
                    }
                  }
                });
                
                // Taxa de sucesso do CNJ
                const successRate = cnjRequests > 0 ? ((cnjSuccessCount / cnjRequests) * 100).toFixed(1) : "0.0";
                
                // Calcular uptime
                const now = Math.floor(Date.now() / 1000);
                const uptimeSeconds = now - startTime;
                const uptimeFormatted = formatUptime(uptimeSeconds);
                
                // Calcular uso de CPU (aproximação, já que precisamos do delta)
                const cpuUsagePercent = ((cpuUserTime + cpuSystemTime) / uptimeSeconds) * 100;
                
                // Formatar uso de memória
                const memoryUsageMB = Math.round(memoryUsed / (1024 * 1024));
                
                // Atualizar os elementos para IA
                document.getElementById('ai-requests').textContent = aiRequests || "0";
                document.getElementById('ai-tokens').textContent = aiTokens ? aiTokens.toLocaleString() : "0";
                document.getElementById('ai-time').textContent = aiTime ? aiTime + 's' : "0s";
                
                // Atualizar elementos para CNJ
                document.getElementById('cnj-requests').textContent = cnjRequests || "0";
                document.getElementById('cnj-success-rate').textContent = successRate + '%';
                document.getElementById('cnj-time').textContent = cnjTime ? cnjTime + 's' : "0s";
                
                // Atualizar elementos do sistema
                document.getElementById('cpu-usage').textContent = cpuUsagePercent.toFixed(1) + '%';
                document.getElementById('memory-usage').textContent = memoryUsageMB + ' MB';
                document.getElementById('uptime').textContent = uptimeFormatted;
                
                // Renderizar gráficos para IA
                renderEndpointChart(endpointData);
                renderResponseTimeChart(responseTimeData);
                
                // Renderizar gráficos para CNJ
                renderTribunalChart(tribunalData);
                renderTribunalTimeChart(tribunalTimeData);
                
              } catch (error) {
                console.error('Erro ao carregar métricas:', error);
              }
            }
            
            // Formatar uptime em dias, horas, minutos
            function formatUptime(seconds) {
              const days = Math.floor(seconds / 86400);
              const hours = Math.floor((seconds % 86400) / 3600);
              const minutes = Math.floor((seconds % 3600) / 60);
              
              let result = '';
              if (days > 0) result += days + 'd ';
              if (hours > 0 || days > 0) result += hours + 'h ';
              result += minutes + 'm';
              
              return result;
            }
            
            // Função para renderizar gráfico de endpoints
            function renderEndpointChart(data) {
              const ctx = document.getElementById('endpoint-chart').getContext('2d');
              
              // Destruir gráfico existente se houver
              if (window.endpointChart) {
                window.endpointChart.destroy();
              }
              
              window.endpointChart = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: data.labels.length ? data.labels : ['Nenhum dado'],
                  datasets: [{
                    label: 'Requisições',
                    data: data.values.length ? data.values : [0],
                    backgroundColor: 'rgba(0, 178, 214, 0.7)',
                    borderColor: 'rgba(0, 178, 214, 1)',
                    borderWidth: 1
                  }]
                },
                options: {
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }
              });
            }
            
            // Função para renderizar gráfico de tempo de resposta
            function renderResponseTimeChart(data) {
              const ctx = document.getElementById('response-time-chart').getContext('2d');
              
              // Destruir gráfico existente se houver
              if (window.responseTimeChart) {
                window.responseTimeChart.destroy();
              }
              
              // Verificar se há dados
              const hasData = data.values.some(v => v > 0);
              
              window.responseTimeChart = new Chart(ctx, {
                type: 'pie',
                data: {
                  labels: data.labels,
                  datasets: [{
                    data: hasData ? data.values : [1],
                    backgroundColor: hasData ? [
                      'rgba(0, 178, 214, 0.9)',
                      'rgba(0, 178, 214, 0.8)',
                      'rgba(0, 178, 214, 0.7)',
                      'rgba(0, 178, 214, 0.6)',
                      'rgba(0, 178, 214, 0.5)',
                      'rgba(0, 178, 214, 0.4)',
                      'rgba(0, 178, 214, 0.3)',
                      'rgba(0, 178, 214, 0.2)'
                    ] : ['#cccccc']
                  }]
                },
                options: {
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          if (!hasData) return 'Nenhum dado disponível';
                          return context.label + ': ' + context.raw;
                        }
                      }
                    }
                  }
                }
              });
            }
            
            // Função para renderizar gráfico de tribunais
            function renderTribunalChart(data) {
              const ctx = document.getElementById('tribunal-chart').getContext('2d');
              
              // Destruir gráfico existente se houver
              if (window.tribunalChart) {
                window.tribunalChart.destroy();
              }
              
              // Verificar se há dados
              const hasData = data.values.some(v => v > 0);
              
              window.tribunalChart = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: hasData ? data.labels : ['Nenhum dado'],
                  datasets: [{
                    label: 'Requisições',
                    data: hasData ? data.values : [0],
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                  }]
                },
                options: {
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }
              });
            }
            
            // Função para renderizar gráfico de tempos por tribunal
            function renderTribunalTimeChart(data) {
              const ctx = document.getElementById('tribunal-time-chart').getContext('2d');
              
              // Destruir gráfico existente se houver
              if (window.tribunalTimeChart) {
                window.tribunalTimeChart.destroy();
              }
              
              // Verificar se há dados
              const hasData = data.values.some(v => v > 0);
              
              window.tribunalTimeChart = new Chart(ctx, {
                type: 'bar',
                data: {
                  labels: hasData ? data.labels : ['Nenhum dado'],
                  datasets: [{
                    label: 'Tempo Médio (s)',
                    data: hasData ? data.values : [0],
                    backgroundColor: 'rgba(153, 102, 255, 0.7)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                  }]
                },
                options: {
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }
              });
            }
            
            // Carregar métricas iniciais
            loadMetrics();
            
            // Atualizar a cada 30 segundos
            setInterval(loadMetrics, 30000);
          </script>
        </body>
      </html>
    `);
  });

  logger.info('Sistema de monitoramento inicializado com sucesso');
  console.log('[Metrics] Sistema de monitoramento inicializado e configurado');
  
  return metricsMiddleware;
};

module.exports = { setupMonitoring };