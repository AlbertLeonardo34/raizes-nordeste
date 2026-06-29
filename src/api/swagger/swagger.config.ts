import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Raízes do Nordeste — API Back-End',
      version: '1.0.0',
      description: `
## Projeto Multidisciplinar — UNINTER — Trilha Back-End

API REST para a rede de lanchonetes **Raízes do Nordeste**.

### Como autenticar
1. Execute **POST /api/v1/auth/login** com email e senha
2. Copie **apenas o valor** do \`accessToken\` retornado (sem as aspas do JSON)
3. Clique em **Authorize** (🔒) e cole **só o token** — não digite "Bearer ", o Swagger já adiciona o prefixo automaticamente

### Usuários do seed
| Perfil | E-mail | Senha |
|--------|--------|-------|
| ADMIN | admin@raizesnordeste.com | Senha@123 |
| GERENTE | gerente@raizesnordeste.com | Senha@123 |
| CLIENTE | cliente@exemplo.com | Senha@123 |

### Padrão de erro
\`\`\`json
{
  "error": "CODIGO_ERRO",
  "message": "Descrição legível",
  "details": [{"field": "campo", "issue": "problema"}],
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/rota",
  "requestId": "uuid"
}
\`\`\`
      `,
      contact: { name: 'UNINTER — Trilha Back-End' },
    },
    servers: [
      { url: 'http://localhost:3000/api/v1', description: 'Desenvolvimento local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido via POST /auth/login',
        },
      },
      schemas: {
        ErroResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'VALIDACAO_INVALIDA' },
            message: { type: 'string', example: 'Dados inválidos' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  issue: { type: 'string' },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
            path: { type: 'string' },
            requestId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autenticação e autorização (JWT + RBAC)' },
      { name: 'Unidades', description: 'Unidades da rede e cardápio por unidade' },
      { name: 'Pedidos', description: 'Fluxo crítico: criar pedido → estoque → pagamento → status' },
      { name: 'Estoque', description: 'Controle de estoque por unidade (entrada/saída)' },
      { name: 'Fidelidade', description: 'Programa de fidelidade com conformidade LGPD' },
    ],
    paths: {
      '/auth/registrar': {
        post: {
          tags: ['Auth'],
          summary: 'Registrar novo cliente',
          description: 'Cria um novo usuário com perfil CLIENTE. O campo **consentimentoLGPD** é obrigatório (LGPD).',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['nome', 'email', 'senha', 'consentimentoLGPD'],
                  properties: {
                    nome: { type: 'string', minLength: 2, example: 'Maria da Silva' },
                    email: { type: 'string', format: 'email', example: 'maria@email.com' },
                    senha: { type: 'string', minLength: 6, example: 'Senha@123' },
                    telefone: { type: 'string', example: '81999999999' },
                    consentimentoLGPD: { type: 'boolean', example: true, description: 'Obrigatório — LGPD' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Usuário criado com sucesso — retorna accessToken' },
            '409': { description: 'E-mail já cadastrado', content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErroResponse' } } } },
            '422': { description: 'Dados inválidos (incluindo consentimentoLGPD: false)', content: { 'application/json': { schema: { '$ref': '#/components/schemas/ErroResponse' } } } },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login — obter token JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'senha'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'cliente@exemplo.com' },
                    senha: { type: 'string', example: 'Senha@123' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login bem-sucedido',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      tokenType: { type: 'string', example: 'Bearer' },
                      expiresIn: { type: 'integer', example: 86400 },
                      usuario: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          nome: { type: 'string' },
                          email: { type: 'string' },
                          perfil: { type: 'string', enum: ['ADMIN','GERENTE','ATENDENTE','COZINHA','CLIENTE'] },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { description: 'Credenciais inválidas' },
          },
        },
      },
      '/auth/perfil': {
        get: {
          tags: ['Auth'],
          summary: 'Dados do usuário autenticado',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Dados do usuário logado' },
            '401': { description: 'Token não fornecido ou inválido' },
          },
        },
      },
      '/unidades': {
        get: {
          tags: ['Unidades'],
          summary: 'Listar unidades ativas da rede',
          responses: { '200': { description: 'Lista de unidades' } },
        },
      },
      '/unidades/{id}': {
        get: {
          tags: ['Unidades'],
          summary: 'Buscar unidade por ID',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Unidade encontrada' },
            '404': { description: 'Unidade não encontrada' },
          },
        },
      },
      '/unidades/{id}/cardapio': {
        get: {
          tags: ['Unidades'],
          summary: 'Cardápio disponível por unidade (considera estoque)',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Cardápio com produtos disponíveis' },
            '404': { description: 'Unidade não encontrada' },
          },
        },
      },
      '/pedidos': {
        post: {
          tags: ['Pedidos'],
          summary: 'Criar pedido — Fluxo Crítico',
          description: 'Valida estoque → cria pedido → processa pagamento mock → atualiza status. O campo **canalPedido** é obrigatório (multicanalidade).',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['unidadeId', 'canalPedido', 'itens', 'formaPagamento'],
                  properties: {
                    unidadeId: { type: 'string', format: 'uuid' },
                    canalPedido: { type: 'string', enum: ['APP','TOTEM','BALCAO','PICKUP','WEB'], description: 'Canal de origem do pedido — obrigatório para rastreabilidade' },
                    itens: {
                      type: 'array',
                      minItems: 1,
                      items: {
                        type: 'object',
                        required: ['produtoId','quantidade'],
                        properties: {
                          produtoId: { type: 'string', format: 'uuid' },
                          quantidade: { type: 'integer', minimum: 1 },
                        },
                      },
                    },
                    formaPagamento: { type: 'string', example: 'PIX', description: 'Use RECUSADO_MOCK para simular recusa' },
                    observacoes: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Pedido criado — ver status e resultado do pagamento' },
            '401': { description: 'Não autenticado' },
            '403': { description: 'Sem permissão (requer perfil CLIENTE)' },
            '404': { description: 'Unidade ou produto não encontrado' },
            '409': { description: 'Estoque insuficiente' },
            '422': { description: 'Dados inválidos ou canalPedido ausente' },
          },
        },
        get: {
          tags: ['Pedidos'],
          summary: 'Listar pedidos com filtros e paginação',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'query', name: 'canalPedido', schema: { type: 'string', enum: ['APP','TOTEM','BALCAO','PICKUP','WEB'] } },
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['AGUARDANDO_PAGAMENTO','PAGO','EM_PREPARO','PRONTO','ENTREGUE','CANCELADO'] } },
            { in: 'query', name: 'unidadeId', schema: { type: 'string', format: 'uuid' } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
          ],
          responses: { '200': { description: 'Lista paginada de pedidos' }, '401': { description: 'Não autenticado' } },
        },
      },
      '/pedidos/{id}': {
        get: {
          tags: ['Pedidos'],
          summary: 'Buscar pedido por ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            '200': { description: 'Pedido encontrado' },
            '401': { description: 'Não autenticado' },
            '403': { description: 'Sem permissão' },
            '404': { description: 'Pedido não encontrado' },
          },
        },
      },
      '/pedidos/{id}/status': {
        patch: {
          tags: ['Pedidos'],
          summary: 'Atualizar status do pedido',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: {
                    status: { type: 'string', enum: ['AGUARDANDO_PAGAMENTO','PAGO','EM_PREPARO','PRONTO','ENTREGUE','CANCELADO'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Status atualizado' },
            '401': { description: 'Não autenticado' },
            '403': { description: 'Sem permissão (requer ADMIN/GERENTE/ATENDENTE/COZINHA)' },
            '404': { description: 'Pedido não encontrado' },
          },
        },
      },
      '/estoque/{unidadeId}': {
        get: {
          tags: ['Estoque'],
          summary: 'Listar estoque por unidade',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'unidadeId', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Lista de estoque da unidade' }, '404': { description: 'Unidade não encontrada' } },
        },
      },
      '/estoque/{unidadeId}/movimentar': {
        post: {
          tags: ['Estoque'],
          summary: 'Movimentar estoque (entrada ou saída)',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'unidadeId', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['produtoId','tipo','quantidade','motivo'],
                  properties: {
                    produtoId: { type: 'string', format: 'uuid' },
                    tipo: { type: 'string', enum: ['ENTRADA','SAIDA'] },
                    quantidade: { type: 'integer', minimum: 1 },
                    motivo: { type: 'string', example: 'Reposição semanal' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Movimentação registrada com saldo atualizado' }, '422': { description: 'Dados inválidos ou estoque insuficiente' } },
        },
      },
      '/estoque/{unidadeId}/saldo/{produtoId}': {
        get: {
          tags: ['Estoque'],
          summary: 'Consultar saldo de produto por unidade',
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: 'path', name: 'unidadeId', required: true, schema: { type: 'string', format: 'uuid' } },
            { in: 'path', name: 'produtoId', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { '200': { description: 'Saldo do produto na unidade' }, '404': { description: 'Estoque não encontrado' } },
        },
      },
      '/fidelidade/{clienteId}': {
        get: {
          tags: ['Fidelidade'],
          summary: 'Consultar pontos e histórico de fidelidade',
          description: 'LGPD: CLIENTE só acessa seus próprios dados. GERENTE/ADMIN podem consultar qualquer cliente.',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'clienteId', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: { '200': { description: 'Pontos e histórico' }, '403': { description: 'Sem permissão (dados de outro cliente)' }, '404': { description: 'Fidelidade não encontrada' } },
        },
      },
      '/fidelidade/{clienteId}/resgatar': {
        post: {
          tags: ['Fidelidade'],
          summary: 'Resgatar pontos acumulados',
          security: [{ bearerAuth: [] }],
          parameters: [{ in: 'path', name: 'clienteId', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['pontos'],
                  properties: { pontos: { type: 'integer', minimum: 1, example: 50 } },
                },
              },
            },
          },
          responses: { '200': { description: 'Pontos resgatados' }, '422': { description: 'Pontos insuficientes ou inválidos' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
