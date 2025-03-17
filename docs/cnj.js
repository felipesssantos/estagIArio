/**
 * @swagger
 * components:
 *  schemas:
 *    TribunalInfo:
 *      type: object
 *      properties:
 *        codigo:
 *          type: string
 *          description: Código identificador do tribunal
 *          example: "tjsp"
 *        nome:
 *          type: string
 *          description: Nome completo do tribunal
 *          example: "Tribunal de Justiça do Estado de São Paulo"
 *    TribunaisResponse:
 *      type: object
 *      properties:
 *        success:
 *          type: boolean
 *          description: Indica se a requisição foi bem-sucedida
 *        tribunais:
 *          type: array
 *          items:
 *            $ref: '#/components/schemas/TribunalInfo'
 *    ConsultaProcessoRequest:
 *      type: object
 *      required:
 *        - numeroProcesso
 *        - tribunal
 *      properties:
 *        numeroProcesso:
 *          type: string
 *          description: Número do processo no formato CNJ
 *          example: "0000000-00.0000.0.00.0000"
 *        tribunal:
 *          type: string
 *          description: Código do tribunal onde o processo está tramitando
 *          example: "tjsp"
 *    MovimentoProcesso:
 *      type: object
 *      properties:
 *        data:
 *          type: string
 *          format: date
 *          description: Data da movimentação
 *        nome:
 *          type: string
 *          description: Descrição da movimentação
 *        complementos:
 *          type: array
 *          items:
 *            type: object
 *            properties:
 *              nome:
 *                type: string
 *              valor:
 *                type: string
 *              descricao:
 *                type: string
 *    ConsultaProcessoResponse:
 *      type: object
 *      properties:
 *        success:
 *          type: boolean
 *          description: Indica se a requisição foi bem-sucedida
 *        encontrado:
 *          type: boolean
 *          description: Indica se o processo foi encontrado
 *        sigilo:
 *          type: boolean
 *          description: Indica se o processo está sob sigilo
 *        processo:
 *          type: object
 *          properties:
 *            numeroProcesso:
 *              type: string
 *            tribunal:
 *              $ref: '#/components/schemas/TribunalInfo'
 *            classe:
 *              type: object
 *              properties:
 *                codigo:
 *                  type: string
 *                nome:
 *                  type: string
 *            orgaoJulgador:
 *              type: object
 *              properties:
 *                nome:
 *                  type: string
 *            dataAjuizamento:
 *              type: string
 *              format: date
 *            ultimaAtualizacao:
 *              type: string
 *              format: date
 *            sistema:
 *              type: object
 *              properties:
 *                nome:
 *                  type: string
 *            assuntos:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  nome:
 *                    type: string
 *        movimentos:
 *          type: array
 *          items:
 *            $ref: '#/components/schemas/MovimentoProcesso'
 *        tempo:
 *          type: number
 *          description: Tempo de processamento em milissegundos
 */

/**
 * @swagger
 * /cnj/tribunais:
 *   get:
 *     summary: Retorna a lista de tribunais disponíveis para consulta
 *     tags: [CNJ]
 *     responses:
 *       200:
 *         description: Lista de tribunais retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TribunaisResponse'
 *       500:
 *         description: Erro do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /cnj/consultar:
 *   post:
 *     summary: Consulta informações de um processo judicial
 *     tags: [CNJ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConsultaProcessoRequest'
 *     responses:
 *       200:
 *         description: Informações do processo retornadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConsultaProcessoResponse'
 *       400:
 *         description: Requisição inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Processo não encontrado
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