import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { pedidoController } from '../controllers/pedido.controller';
import { unidadeController } from '../controllers/unidade.controller';
import { estoqueController } from '../controllers/estoque.controller';
import { fidelidadeController } from '../controllers/fidelidade.controller';
import { autenticar, autorizar } from '../middlewares/auth.middleware';

const router = Router();

// ========================
// AUTH
// ========================
/**
 * @swagger
 * /auth/registrar:
 *   post:
 *     summary: Registrar novo cliente
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nome, email, senha, consentimentoLGPD]
 *             properties:
 *               nome: { type: string }
 *               email: { type: string, format: email }
 *               senha: { type: string, minLength: 6 }
 *               telefone: { type: string }
 *               consentimentoLGPD: { type: boolean }
 *     responses:
 *       201: { description: Usuário criado }
 *       409: { description: E-mail já cadastrado }
 *       422: { description: Dados inválidos }
 */
router.post('/auth/registrar', (req, res) => authController.registrar(req, res));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login e obtenção de token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, senha]
 *             properties:
 *               email: { type: string }
 *               senha: { type: string }
 *     responses:
 *       200: { description: Token JWT retornado }
 *       401: { description: Credenciais inválidas }
 */
router.post('/auth/login', (req, res) => authController.login(req, res));

/**
 * @swagger
 * /auth/perfil:
 *   get:
 *     summary: Retorna dados do usuário autenticado
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dados do usuário }
 *       401: { description: Token inválido }
 */
router.get('/auth/perfil', autenticar, (req, res) => authController.perfil(req, res));

// ========================
// UNIDADES
// ========================
/**
 * @swagger
 * /unidades:
 *   get:
 *     summary: Listar todas as unidades ativas
 *     tags: [Unidades]
 *     responses:
 *       200: { description: Lista de unidades }
 */
router.get('/unidades', (req, res) => unidadeController.listar(req, res));
router.get('/unidades/:id', (req, res) => unidadeController.buscarPorId(req, res));

/**
 * @swagger
 * /unidades/{id}/cardapio:
 *   get:
 *     summary: Cardápio disponível por unidade (com estoque)
 *     tags: [Unidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Cardápio da unidade }
 *       404: { description: Unidade não encontrada }
 */
router.get('/unidades/:id/cardapio', (req, res) => unidadeController.cardapio(req, res));

// ========================
// PEDIDOS
// ========================
/**
 * @swagger
 * /pedidos:
 *   post:
 *     summary: Criar novo pedido (fluxo crítico)
 *     tags: [Pedidos]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unidadeId, canalPedido, itens, formaPagamento]
 *             properties:
 *               unidadeId: { type: string }
 *               canalPedido: { type: string, enum: [APP, TOTEM, BALCAO, PICKUP, WEB] }
 *               itens:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     produtoId: { type: string }
 *                     quantidade: { type: integer }
 *               formaPagamento: { type: string }
 *               observacoes: { type: string }
 *     responses:
 *       201: { description: Pedido criado }
 *       401: { description: Não autenticado }
 *       404: { description: Unidade ou produto não encontrado }
 *       409: { description: Estoque insuficiente }
 *       422: { description: Dados inválidos }
 */
router.post('/pedidos', autenticar, autorizar('CLIENTE'), (req, res) => pedidoController.criar(req, res));

/**
 * @swagger
 * /pedidos:
 *   get:
 *     summary: Listar pedidos (filtros por canal, status, unidade)
 *     tags: [Pedidos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: canalPedido
 *         schema: { type: string, enum: [APP, TOTEM, BALCAO, PICKUP, WEB] }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: unidadeId
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Lista paginada de pedidos }
 */
router.get('/pedidos', autenticar, (req, res) => pedidoController.listar(req, res));
router.get('/pedidos/:id', autenticar, (req, res) => pedidoController.buscarPorId(req, res));
router.patch('/pedidos/:id/status', autenticar, autorizar('ADMIN', 'GERENTE', 'ATENDENTE', 'COZINHA'), (req, res) => pedidoController.atualizarStatus(req, res));

// ========================
// ESTOQUE
// ========================
router.get('/estoque/:unidadeId', autenticar, autorizar('ADMIN', 'GERENTE', 'ATENDENTE'), (req, res) => estoqueController.listarPorUnidade(req, res));
router.post('/estoque/:unidadeId/movimentar', autenticar, autorizar('ADMIN', 'GERENTE'), (req, res) => estoqueController.movimentar(req, res));
router.get('/estoque/:unidadeId/saldo/:produtoId', autenticar, autorizar('ADMIN', 'GERENTE', 'ATENDENTE'), (req, res) => estoqueController.saldo(req, res));

// ========================
// FIDELIDADE
// ========================
router.get('/fidelidade/:clienteId', autenticar, (req, res) => fidelidadeController.consultar(req, res));
router.post('/fidelidade/:clienteId/resgatar', autenticar, autorizar('CLIENTE'), (req, res) => fidelidadeController.resgatar(req, res));

export { router };
