// services/openai.service.js
const { OpenAI } = require('openai');
const config = require('../config/config');

// Instanciar o cliente OpenAI uma única vez
const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

/**
 * Serviço para interações com a API da OpenAI
 */
class OpenAIService {
  /**
   * Envia uma prompt para a API do ChatGPT e retorna a resposta
   * @param {string|Array} prompt - Texto ou array de mensagens para o ChatGPT
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} - Resposta processada
   */
  async sendPrompt(prompt, options = {}) {
    const startTime = Date.now();
    
    try {
      const messages = Array.isArray(prompt) ? prompt : [
        { role: 'system', content: 'Você é um assistente jurídico especializado.' },
        { role: 'user', content: prompt }
      ];
      
      const response = await openai.chat.completions.create({
        model: options.model || config.openai.model,
        messages: messages,
        max_tokens: options.maxTokens || config.openai.maxTokens,
        temperature: options.temperature || 0.7
      });
      
      const processingTime = Date.now() - startTime;
      
      return {
        resultado: response.choices[0].message.content,
        tokens: {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens
        },
        model: response.model,
        tempo: processingTime
      };
    } catch (error) {
      console.error('Erro ao enviar prompt para OpenAI:', error);
      throw error;
    }
  }
  
  /**
   * Gera um resumo de texto jurídico
   * @param {string} texto - Texto a ser resumido
   * @param {Array} opcoes - Opções para personalizar o resumo
   * @returns {Promise<Object>} - Resumo gerado
   */
  async gerarResumo(texto, opcoes = []) {
    const instrucoes = opcoes.length > 0 
      ? `Faça um resumo do seguinte processo judicial, ${opcoes.join(', ')}:\n\n` 
      : 'Faça um resumo objetivo do seguinte processo judicial:\n\n';
    
    return this.sendPrompt(instrucoes + texto);
  }
  
  /**
   * Gera uma petição inicial com base nas informações fornecidas
   * @param {Object} dados - Dados para a petição
   * @returns {Promise<Object>} - Petição gerada
   */
  async gerarPeticao(dados) {
    const prompt = `Crie uma petição inicial para uma ${dados.tipoAcao} com os seguintes elementos:
    
    QUALIFICAÇÃO DAS PARTES:
    ${dados.partesProcesso}
    
    FATOS:
    ${dados.fatos}
    
    PEDIDOS:
    ${dados.pedidos}
    
    Formate a petição completa seguindo as regras processuais brasileiras, incluindo endereçamento ao juízo, qualificação das partes, fatos, fundamentos jurídicos, pedidos e fechamento. A petição deve estar pronta para ser utilizada, precisando apenas de assinatura do advogado.`;
    
    return this.sendPrompt(prompt);
  }
  
  /**
   * Realiza análise jurídica de um texto
   * @param {Object} dados - Dados para análise
   * @returns {Promise<Object>} - Análise jurídica
   */
  async realizarAnalise(dados) {
    let instrucao = '';
    
    switch (dados.tipoAnalise) {
      case 'contrato':
        instrucao = 'Faça uma análise detalhada deste contrato, identificando cláusulas importantes, possíveis riscos e sugestões de melhorias:';
        break;
      case 'decisao':
        instrucao = 'Analise esta decisão judicial, explicando seus principais pontos, fundamentos e implicações:';
        break;
      case 'legislacao':
        instrucao = 'Interprete este texto legal, explicando seu significado, aplicação prática e possíveis interpretações:';
        break;
      case 'jurisprudencia':
        instrucao = 'Analise esta jurisprudência, explicando seu contexto, entendimento do tribunal e como pode ser aplicada em casos similares:';
        break;
      case 'risco':
        instrucao = 'Faça uma avaliação de riscos legais deste documento, identificando pontos críticos e sugerindo mitigações:';
        break;
      default:
        instrucao = 'Faça uma análise jurídica do seguinte texto:';
    }
    
    let prompt = `${instrucao}\n\n${dados.textoAnalise}`;
    
    if (dados.perguntaEspecifica) {
      prompt += `\n\nFoque especialmente em responder esta pergunta: ${dados.perguntaEspecifica}`;
    }
    
    return this.sendPrompt(prompt);
  }
  
  /**
   * Melhora e corrige texto extraído de imagens (OCR)
   * @param {string} textoOCR - Texto extraído via OCR
   * @param {Object} opcoes - Opções para a correção
   * @returns {Promise<Object>} - Texto corrigido
   */
  async corrigirTextoOCR(textoOCR, opcoes = {}) {
    const instrucoes = [];
    
    if (opcoes.corrigirErros) {
      instrucoes.push('corrija erros ortográficos e de pontuação');
    }
    
    if (opcoes.manterFormatacao) {
      instrucoes.push('tente preservar a formatação original do documento, incluindo parágrafos e estrutura');
    }
    
    const prompt = `O texto a seguir foi extraído de uma imagem ou PDF usando OCR e pode conter erros. 
    ${instrucoes.length > 0 ? 'Por favor ' + instrucoes.join(' e ') + ':' : 'Corrija-o:'}
    
    ${textoOCR}`;
    
    const resultado = await this.sendPrompt(prompt);
    
    // Para OCR, retornamos o texto sem formatação Markdown
    return {
      ...resultado,
      resultado: resultado.resultado.replace(/```[a-z]*\n|```/g, '') // Remove delimitadores de código se existirem
    };
  }


  /**
 * Extrai texto de uma imagem usando a API Vision
 * @param {string} base64File - Arquivo em formato base64
 * @param {string} mimeType - Tipo MIME do arquivo
 * @param {Object} options - Opções para a extração
 * @returns {Promise<Object>} - Texto extraído e metadados
 */
async extrairTextoDeImagem(base64File, mimeType, options = {}) {
    const startTime = Date.now();
    
    // Construir prompt para a extração
    let promptInstructions = "Extraia todo o texto deste documento";
    if (options.corrigirErros) promptInstructions += " e corrija possíveis erros de OCR";
    if (options.manterFormatacao) promptInstructions += " mantendo a formatação original o máximo possível";
    promptInstructions += ". Retorne APENAS o texto extraído, sem comentários adicionais.";
    
    try {
      // Usar GPT-4o para extração de texto das imagens
      const modeloUsado = "gpt-4o";
      
      // Chamar a API da OpenAI
      const completion = await openai.chat.completions.create({
        model: modeloUsado,
        messages: [
          {
            role: "system",
            content: "Você é um assistente especializado em extrair texto de imagens. Retorne apenas o texto extraído, sem comentários adicionais."
          },
          {
            role: "user",
            content: [
              { type: "text", text: promptInstructions },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64File}`
                }
              }
            ]
          }
        ],
        max_tokens: options.maxTokens || 4096
      });
  
      // Processar a resposta
      let texto = completion.choices[0].message.content;
      texto = texto.replace(/```text/g, '').replace(/```/g, '');
      texto = texto.replace(/^Texto extraído:\n/i, '');
      texto = texto.replace(/^Aqui está o texto extraído:\n/i, '');
  
      // Capturar tokens
      const tokens = {
        prompt: completion.usage.prompt_tokens,
        completion: completion.usage.completion_tokens,
        total: completion.usage.total_tokens
      };
      
      const endTime = Date.now();
      console.log(`[EXTRACAO-IMAGEM] Modelo: ${modeloUsado} | Tokens: ${tokens.total} | Tempo: ${endTime - startTime}ms`);
      
      return {
        resultado: texto,
        modelo: modeloUsado,
        tokens,
        tempo: endTime - startTime
      };
    } catch (error) {
      console.error('Erro ao extrair texto de imagem:', error);
      throw error;
    }
  }
  
  /**
   * Corrige texto extraído de PDF
   * @param {string} textoExtraido - Texto extraído do PDF
   * @returns {Promise<Object>} - Texto corrigido e metadados
   */
  async corrigirTextoPDF(textoExtraido) {
    const startTime = Date.now();
    
    try {
      // Usar modelo mais adequado para o tamanho do texto
      const modeloUsado = textoExtraido.length > 10000 ? "gpt-3.5-turbo-16k" : "gpt-4o";
      
      const completion = await openai.chat.completions.create({
        model: modeloUsado,
        messages: [
          {
            role: "system",
            content: "Você é um assistente especializado em corrigir erros de extração de texto de PDFs. Retorne apenas o texto corrigido, sem comentários adicionais."
          },
          {
            role: "user",
            content: `Corrija possíveis erros de extração no seguinte texto extraído de um PDF, mantendo o conteúdo original o mais fiel possível: \n\n${textoExtraido}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4096
      });
      
      // Capturar tokens para a correção com IA
      const tokens = {
        prompt: completion.usage.prompt_tokens,
        completion: completion.usage.completion_tokens,
        total: completion.usage.total_tokens
      };
      
      const endTime = Date.now();
      console.log(`[EXTRACAO-CORRECAO] Modelo: ${modeloUsado} | Tokens: ${tokens.total} | Tempo: ${endTime - startTime}ms`);
      
      return {
        resultado: completion.choices[0].message.content,
        modelo: modeloUsado,
        tokens,
        tempo: endTime - startTime
      };
    } catch (error) {
      console.error('Erro ao corrigir texto de PDF:', error);
      throw error;
    }
  }
}



module.exports = new OpenAIService();