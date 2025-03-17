/**
 * @swagger
 * components:
 *  schemas:
 *    ResumoRequest:
 *      type: object
 *      required:
 *        - textoProcesso
 *      properties:
 *        textoProcesso:
 *          type: string
 *          description: Texto do processo a ser resumido
 *        opcoes:
 *          type: array
 *          items:
 *            type: string
 *          description: Opções para personalizar o resumo
 *          example: ["destacar datas importantes", "enfatizar as partes envolvidas"]
 *    ResumoResponse:
 *      type: object
 *      properties:
 *        resultado:
 *          type: string
 *          description: Resumo gerado para o processo
 *        tokens:
 *          $ref: '#/components/schemas/TokenInfo'
 *        tempo:
 *          type: number
 *          description: Tempo de processamento em milissegundos
 */

/**
 * @swagger
 * /ai/resumo:
 *   post:
 *     summary: Gera um resumo de um texto jurídico
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResumoRequest'
 *     responses:
 *       200:
 *         description: Resumo gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResumoResponse'
 *       400:
 *         description: Requisição inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * components:
 *  schemas:
 *    PeticaoRequest:
 *      type: object
 *      required:
 *        - tipoAcao
 *        - partesProcesso
 *        - fatos
 *        - pedidos
 *      properties:
 *        tipoAcao:
 *          type: string
 *          description: Tipo da ação judicial
 *          example: "Ação de Cobrança"
 *        partesProcesso:
 *          type: string
 *          description: Descrição das partes envolvidas no processo
 *        fatos:
 *          type: string
 *          description: Descrição dos fatos relevantes para a ação
 *        pedidos:
 *          type: string
 *          description: Lista de pedidos ao juízo
 *    PeticaoResponse:
 *      type: object
 *      properties:
 *        resultado:
 *          type: string
 *          description: Texto da petição inicial gerada
 *        tokens:
 *          $ref: '#/components/schemas/TokenInfo'
 *        tempo:
 *          type: number
 *          description: Tempo de processamento em milissegundos
 */

/**
 * @swagger
 * /ai/peticao:
 *   post:
 *     summary: Gera uma petição inicial com base nas informações fornecidas
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PeticaoRequest'
 *     responses:
 *       200:
 *         description: Petição gerada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PeticaoResponse'
 *       400:
 *         description: Requisição inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */