// services/cnj.service.js
const axios = require('axios');
const config = require('../config/config');

// Mapeamento dos tribunais
const tribunais = {
  // Tribunais Superiores
  'tst': 'Tribunal Superior do Trabalho',
  'tse': 'Tribunal Superior Eleitoral',
  'stj': 'Superior Tribunal de Justiça',
  'stm': 'Superior Tribunal Militar',
  
  // Tribunais Regionais Federais
  'trf1': 'Tribunal Regional Federal da 1ª Região',
  'trf2': 'Tribunal Regional Federal da 2ª Região',
  'trf3': 'Tribunal Regional Federal da 3ª Região',
  'trf4': 'Tribunal Regional Federal da 4ª Região',
  'trf5': 'Tribunal Regional Federal da 5ª Região',
  'trf6': 'Tribunal Regional Federal da 6ª Região',
  
  // Tribunais de Justiça Estaduais
  'tjac': 'Tribunal de Justiça do Acre',
  'tjal': 'Tribunal de Justiça de Alagoas',
  'tjam': 'Tribunal de Justiça do Amazonas',
  'tjap': 'Tribunal de Justiça do Amapá',
  'tjba': 'Tribunal de Justiça da Bahia',
  'tjce': 'Tribunal de Justiça do Ceará',
  'tjdft': 'Tribunal de Justiça do Distrito Federal e Territórios',
  'tjes': 'Tribunal de Justiça do Espírito Santo',
  'tjgo': 'Tribunal de Justiça de Goiás',
  'tjma': 'Tribunal de Justiça do Maranhão',
  'tjmg': 'Tribunal de Justiça de Minas Gerais',
  'tjms': 'Tribunal de Justiça do Mato Grosso do Sul',
  'tjmt': 'Tribunal de Justiça do Mato Grosso',
  'tjpa': 'Tribunal de Justiça do Pará',
  'tjpb': 'Tribunal de Justiça da Paraíba',
  'tjpe': 'Tribunal de Justiça de Pernambuco',
  'tjpi': 'Tribunal de Justiça do Piauí',
  'tjpr': 'Tribunal de Justiça do Paraná',
  'tjrj': 'Tribunal de Justiça do Rio de Janeiro',
  'tjrn': 'Tribunal de Justiça do Rio Grande do Norte',
  'tjro': 'Tribunal de Justiça de Rondônia',
  'tjrr': 'Tribunal de Justiça de Roraima',
  'tjrs': 'Tribunal de Justiça do Rio Grande do Sul',
  'tjsc': 'Tribunal de Justiça de Santa Catarina',
  'tjse': 'Tribunal de Justiça de Sergipe',
  'tjsp': 'Tribunal de Justiça de São Paulo',
  'tjto': 'Tribunal de Justiça do Tocantins',
  
  // Tribunais Regionais do Trabalho
  'trt1': 'Tribunal Regional do Trabalho da 1ª Região',
  'trt2': 'Tribunal Regional do Trabalho da 2ª Região',
  'trt3': 'Tribunal Regional do Trabalho da 3ª Região',
  'trt4': 'Tribunal Regional do Trabalho da 4ª Região',
  'trt5': 'Tribunal Regional do Trabalho da 5ª Região',
  'trt6': 'Tribunal Regional do Trabalho da 6ª Região',
  'trt7': 'Tribunal Regional do Trabalho da 7ª Região',
  'trt8': 'Tribunal Regional do Trabalho da 8ª Região',
  'trt9': 'Tribunal Regional do Trabalho da 9ª Região',
  'trt10': 'Tribunal Regional do Trabalho da 10ª Região',
  'trt11': 'Tribunal Regional do Trabalho da 11ª Região',
  'trt12': 'Tribunal Regional do Trabalho da 12ª Região',
  'trt13': 'Tribunal Regional do Trabalho da 13ª Região',
  'trt14': 'Tribunal Regional do Trabalho da 14ª Região',
  'trt15': 'Tribunal Regional do Trabalho da 15ª Região',
  'trt16': 'Tribunal Regional do Trabalho da 16ª Região',
  'trt17': 'Tribunal Regional do Trabalho da 17ª Região',
  'trt18': 'Tribunal Regional do Trabalho da 18ª Região',
  'trt19': 'Tribunal Regional do Trabalho da 19ª Região',
  'trt20': 'Tribunal Regional do Trabalho da 20ª Região',
  'trt21': 'Tribunal Regional do Trabalho da 21ª Região',
  'trt22': 'Tribunal Regional do Trabalho da 22ª Região',
  'trt23': 'Tribunal Regional do Trabalho da 23ª Região',
  'trt24': 'Tribunal Regional do Trabalho da 24ª Região',
  
  // Tribunais Regionais Eleitorais
  'tre-ac': 'Tribunal Regional Eleitoral do Acre',
  'tre-al': 'Tribunal Regional Eleitoral de Alagoas',
  'tre-am': 'Tribunal Regional Eleitoral do Amazonas',
  'tre-ap': 'Tribunal Regional Eleitoral do Amapá',
  'tre-ba': 'Tribunal Regional Eleitoral da Bahia',
  'tre-ce': 'Tribunal Regional Eleitoral do Ceará',
  'tre-dft': 'Tribunal Regional Eleitoral do Distrito Federal',
  'tre-es': 'Tribunal Regional Eleitoral do Espírito Santo',
  'tre-go': 'Tribunal Regional Eleitoral de Goiás',
  'tre-ma': 'Tribunal Regional Eleitoral do Maranhão',
  'tre-mg': 'Tribunal Regional Eleitoral de Minas Gerais',
  'tre-ms': 'Tribunal Regional Eleitoral do Mato Grosso do Sul',
  'tre-mt': 'Tribunal Regional Eleitoral do Mato Grosso',
  'tre-pa': 'Tribunal Regional Eleitoral do Pará',
  'tre-pb': 'Tribunal Regional Eleitoral da Paraíba',
  'tre-pe': 'Tribunal Regional Eleitoral de Pernambuco',
  'tre-pi': 'Tribunal Regional Eleitoral do Piauí',
  'tre-pr': 'Tribunal Regional Eleitoral do Paraná',
  'tre-rj': 'Tribunal Regional Eleitoral do Rio de Janeiro',
  'tre-rn': 'Tribunal Regional Eleitoral do Rio Grande do Norte',
  'tre-ro': 'Tribunal Regional Eleitoral de Rondônia',
  'tre-rr': 'Tribunal Regional Eleitoral de Roraima',
  'tre-rs': 'Tribunal Regional Eleitoral do Rio Grande do Sul',
  'tre-sc': 'Tribunal Regional Eleitoral de Santa Catarina',
  'tre-se': 'Tribunal Regional Eleitoral de Sergipe',
  'tre-sp': 'Tribunal Regional Eleitoral de São Paulo',
  'tre-to': 'Tribunal Regional Eleitoral do Tocantins',
  
  // Tribunais de Justiça Militar
  'tjmmg': 'Tribunal de Justiça Militar de Minas Gerais',
  'tjmrs': 'Tribunal de Justiça Militar do Rio Grande do Sul',
  'tjmsp': 'Tribunal de Justiça Militar de São Paulo'
};

/**
 * Serviço para interações com a API do CNJ
 */
class CNJService {
  constructor() {
    this.apiBaseUrl = config.cnj.apiBaseUrl;
    this.apiKey = config.cnj.apiKey;
    this.tribunais = tribunais;
  }
  
  /**
   * Obtém a lista de tribunais disponíveis
   * @returns {Array} Lista de tribunais formatada
   */
  getTribunais() {
    return Object.entries(this.tribunais).map(([codigo, nome]) => ({
      codigo,
      nome
    }));
  }
  
  /**
   * Normaliza o número do processo removendo caracteres não numéricos
   * @param {string} numero - Número do processo com ou sem formatação
   * @returns {string} Número do processo normalizado
   */
  normalizarNumeroProcesso(numero) {
    return numero.replace(/\D/g, '');
  }
  
  /**
   * Formata uma data ISO para formato brasileiro com hora
   * @param {string} dataString - Data em formato ISO
   * @returns {string} Data formatada
   */
  formatarData(dataString) {
    if (!dataString) return '';
    
    const data = new Date(dataString);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Consulta um processo na API do CNJ
   * @param {string} numeroProcesso - Número do processo
   * @param {string} tribunal - Código do tribunal
   * @returns {Promise<Object>} Dados do processo
   */
  async consultarProcesso(numeroProcesso, tribunal) {
    const inicio = Date.now();
    
    try {
      // Normalizar o número do processo (remover pontos, traços, etc)
      const numeroNormalizado = this.normalizarNumeroProcesso(numeroProcesso);
      
      // Validar o número do processo (CNJ tem 20 dígitos)
      if (numeroNormalizado.length !== 20) {
        throw new Error('Número do processo inválido. O número deve conter 20 dígitos no padrão CNJ.');
      }
      
      // Verificar se o tribunal é válido
      if (!Object.keys(this.tribunais).includes(tribunal)) {
        throw new Error('Tribunal inválido');
      }
      
      const apiUrl = `${this.apiBaseUrl}/api_publica_${tribunal}/_search`;
      
      const payload = {
        query: {
          match: {
            numeroProcesso: numeroNormalizado
          }
        }
      };
      
      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Authorization': `ApiKey ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = response.data;
      
      // Verificar se encontrou algum processo
      if (!data.hits || !data.hits.hits || data.hits.hits.length === 0) {
        return {
          success: true,
          encontrado: false,
          mensagem: 'Processo não encontrado',
          tempo: Date.now() - inicio
        };
      }
      
      // Verificar se há mais de um processo com o mesmo número
      const processos = data.hits.hits.map(hit => hit._source);
      const multiplasInstancias = processos.length > 1;
      
      // Verificar se o primeiro processo está em sigilo
      if (processos[0].nivelSigilo && processos[0].nivelSigilo > 0) {
        return {
          success: true,
          encontrado: true,
          sigilo: true,
          mensagem: 'Este processo está sob sigilo e suas informações não podem ser exibidas.',
          dadosBasicos: {
            numeroProcesso: processos[0].numeroProcesso,
            tribunal: this.tribunais[tribunal] || tribunal,
            nivelSigilo: processos[0].nivelSigilo
          },
          tempo: Date.now() - inicio
        };
      }
      
      // Preparar resposta para múltiplas instâncias
      if (multiplasInstancias) {
        const instanciasProcesso = processos.map(processo => {
          // Organizar movimentos por data (do mais recente para o mais antigo)
          const movimentos = Array.isArray(processo.movimentos) ? 
            [...processo.movimentos].sort((a, b) => {
              return new Date(b.dataHora) - new Date(a.dataHora);
            }) : [];
            
          return {
            grau: processo.grau,
            numeroProcesso: processo.numeroProcesso,
            tribunal: {
              codigo: tribunal,
              nome: this.tribunais[tribunal] || tribunal
            },
            classe: processo.classe,
            orgaoJulgador: processo.orgaoJulgador,
            dataAjuizamento: this.formatarData(processo.dataAjuizamento),
            ultimaAtualizacao: this.formatarData(processo.dataHoraUltimaAtualizacao),
            sistema: processo.sistema,
            formato: processo.formato,
            assuntos: processo.assuntos || [],
            movimentos: movimentos.map(m => ({
              codigo: m.codigo,
              nome: m.nome,
              data: this.formatarData(m.dataHora),
              dataIso: m.dataHora,
              complementos: m.complementosTabelados || []
            }))
          };
        });
          
        // Formatando a resposta para múltiplas instâncias
        return {
          success: true,
          encontrado: true,
          sigilo: false,
          multiplasInstancias: true,
          instancias: instanciasProcesso,
          tempo: Date.now() - inicio
        };
      }
      
      // Caso tenha apenas um processo, formata resposta tradicional
      const processo = processos[0];
      
      // Organizar movimentos por data (do mais recente para o mais antigo)
      const movimentos = Array.isArray(processo.movimentos) ? 
        [...processo.movimentos].sort((a, b) => {
          return new Date(b.dataHora) - new Date(a.dataHora);
        }) : [];
      
      // Formatando a resposta
      return {
        success: true,
        encontrado: true,
        sigilo: false,
        multiplasInstancias: false,
        processo: {
          numeroProcesso: processo.numeroProcesso,
          tribunal: {
            codigo: tribunal,
            nome: this.tribunais[tribunal] || tribunal
          },
          classe: processo.classe,
          orgaoJulgador: processo.orgaoJulgador,
          dataAjuizamento: this.formatarData(processo.dataAjuizamento),
          ultimaAtualizacao: this.formatarData(processo.dataHoraUltimaAtualizacao),
          sistema: processo.sistema,
          formato: processo.formato,
          grau: processo.grau,
          assuntos: processo.assuntos || []
        },
        movimentos: movimentos.map(m => ({
          codigo: m.codigo,
          nome: m.nome,
          data: this.formatarData(m.dataHora),
          dataIso: m.dataHora,
          complementos: m.complementosTabelados || []
        })),
        tempo: Date.now() - inicio
      };
      
    } catch (error) {
      console.error('Erro ao consultar processo CNJ:', error);
      
      let status = 500;
      let mensagem = 'Erro ao processar a solicitação';
      
      // Tratar erros específicos da API
      if (error.response) {
        status = error.response.status;
        mensagem = error.response.data?.error?.reason || error.message;
      } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        status = 503;
        mensagem = 'API do CNJ está temporariamente indisponível. Tente novamente mais tarde.';
      } else if (error.message) {
        mensagem = error.message;
      }
      
      throw {
        status,
        mensagem,
        tempo: Date.now() - inicio
      };
    }
  }
}

module.exports = new CNJService();