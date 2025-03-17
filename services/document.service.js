// services/document.service.js
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const openaiService = require('./openai.service');

/**
 * Verifica se um PDF está protegido
 * @param {string} filePath - Caminho do arquivo PDF
 * @returns {Promise<boolean>} - Verdadeiro se o PDF estiver protegido
 */
async function isPdfProtected(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer, { max: 1 }); // Tentar ler apenas a primeira página
    
    // Se não conseguirmos extrair texto algum, pode ser protegido
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      return true;
    }
    
    // Se o texto contiver palavras-chave relacionadas a senhas ou proteção
    const lowerText = pdfData.text.toLowerCase();
    if (lowerText.includes('password') || 
        lowerText.includes('protected') || 
        lowerText.includes('encrypted') ||
        lowerText.includes('senha') || 
        lowerText.includes('protegido') || 
        lowerText.includes('criptografado')) {
      return true;
    }
    
    return false;
  } catch (error) {
    // Se ocorrer um erro ao ler o PDF, é provável que esteja protegido
    console.error('Erro ao verificar proteção do PDF:', error);
    return true;
  }
}

/**
 * Serviço para extração de texto de documentos
 */
class DocumentService {
  /**
   * Extrai texto de um arquivo (PDF ou imagem)
   * @param {Object} file - Objeto do arquivo (multer/formidable)
   * @param {Object} options - Opções para extração
   * @returns {Promise<Object>} - Resultado da extração
   */
  async extrairTexto(file, options = {}) {
    const startTime = Date.now();
    
    try {
      if (!file) {
        throw new Error('Nenhum arquivo foi enviado');
      }
      
      const filePath = file.path || file.filepath;
      const mimetype = file.mimetype;
      
      // Verificar se é um PDF
      const isPDF = mimetype === 'application/pdf';
      let texto = '';
      let modeloUsado = '';
      let tokens = null;
      let protegido = false;
      
      if (isPDF) {
        // Verificar se o PDF está protegido
        protegido = await isPdfProtected(filePath);
        
        if (protegido) {
          console.log("PDF protegido detectado, notificando o usuário.");
          texto = `PDF PROTEGIDO DETECTADO

Este documento PDF está protegido ou criptografado, o que impede a extração automática do texto.

Para extrair o conteúdo deste documento, você pode:
1. Verificar se possui uma versão não protegida do mesmo documento
2. Remover as restrições do PDF usando Adobe Acrobat ou serviços online adequados (se você tiver permissão legal para isso)
3. Usar métodos manuais como captura de tela ou transcrição

Por questões de segurança e conformidade, não tentamos burlar a proteção do documento.`;
          
          modeloUsado = "PDF protegido - extração não realizada";
        } else {
          try {
            // Tentamos extração direta com pdf-parse
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            texto = pdfData.text;
            
            // Verificar se o texto extraído é válido
            if (!texto || texto.trim().length < 50) {
              console.log("PDF com pouco texto extraído, verificando novamente proteção...");
              
              // Verificar novamente se pode ser um PDF protegido
              if (await isPdfProtected(filePath)) {
                console.log("Confirmado que o PDF tem proteções, notificando usuário.");
                texto = `PDF PROTEGIDO DETECTADO

Este documento PDF está protegido ou criptografado, o que impede a extração automática do texto.

Para extrair o conteúdo deste documento, você pode:
1. Verificar se possui uma versão não protegida do mesmo documento
2. Remover as restrições do PDF usando Adobe Acrobat ou serviços online adequados (se você tiver permissão legal para isso)
3. Usar métodos manuais como captura de tela ou transcrição

Por questões de segurança e conformidade, não tentamos burlar a proteção do documento.`;
                
                modeloUsado = "PDF protegido - extração não realizada";
                protegido = true;
              } else {
                // Se não for protegido mas extraiu pouco texto, pode ser um PDF que contém principalmente imagens
                texto = `AVISO: Este PDF parece conter principalmente imagens ou ter pouco texto reconhecível.

O documento pode ser:
1. Um PDF com páginas escaneadas (imagens)
2. Um PDF com pouco conteúdo textual
3. Um PDF com formatação especial que dificulta a extração de texto

Para melhor resultado, você pode:
- Verificar se possui uma versão do documento com texto selecionável
- Usar software OCR especializado para processar o documento
- Enviar as páginas individuais como imagens para processamento`;
                
                modeloUsado = "pdf-parse (pouco texto extraído)";
              }
            }
            // Se solicitado para corrigir erros e texto foi extraído com sucesso
            else if (options.corrigirErros) {
              // Usar modelo para correção
              const resultado = await openaiService.corrigirTextoPDF(texto);
              texto = resultado.resultado;
              modeloUsado = resultado.modelo;
              tokens = resultado.tokens;
            } else {
              modeloUsado = "pdf-parse (sem IA)";
            }
          } catch (pdfError) {
            console.error('Erro ao processar PDF:', pdfError);
            
            // Verificar se é um PDF protegido
            if (await isPdfProtected(filePath)) {
              console.log("PDF confirmado como protegido após falha na extração.");
              texto = `PDF PROTEGIDO DETECTADO

Este documento PDF está protegido ou criptografado, o que impede a extração automática do texto.

Para extrair o conteúdo deste documento, você pode:
1. Verificar se possui uma versão não protegida do mesmo documento
2. Remover as restrições do PDF usando Adobe Acrobat ou serviços online adequados (se você tiver permissão legal para isso)
3. Usar métodos manuais como captura de tela ou transcrição

Por questões de segurança e conformidade, não tentamos burlar a proteção do documento.`;
              
              modeloUsado = "PDF protegido - extração não realizada";
              protegido = true;
            } else {
              // Se não é protegido mas falhou, pode ser por outros motivos
              texto = `Não foi possível extrair o texto do PDF. O arquivo pode estar corrompido ou em um formato não suportado.

Erro técnico: ${pdfError.message}`;
              modeloUsado = "erro - não processado";
            }
          }
        }
      } else {
        // Para imagens, processamos usando a API de visão
        // Converter arquivo para base64
        const fileBuffer = fs.readFileSync(filePath);
        const base64File = fileBuffer.toString('base64');
        
        // Chamar o serviço de extração de texto
        const resultado = await openaiService.extrairTextoDeImagem(base64File, mimetype, {
          corrigirErros: options.corrigirErros,
          manterFormatacao: options.manterFormatacao
        });
        
        texto = resultado.resultado;
        modeloUsado = resultado.modelo;
        tokens = resultado.tokens;
      }
      
      const endTime = Date.now();
      console.log(`Extração realizada usando: ${modeloUsado}`);
      
      // Montar objeto de resposta
      const resposta = { 
        resultado: texto,
        modelo: modeloUsado,
        protegido,
        tempo: endTime - startTime,
      };
      
      // Adicionar informações de tokens se disponíveis
      if (tokens) {
        resposta.tokens = tokens;
      }
      
      return resposta;
      
    } catch (error) {
      console.error('Erro no serviço de extração de texto:', error);
      throw error;
    }
  }
}

module.exports = {
  DocumentService: new DocumentService(),
  isPdfProtected
};