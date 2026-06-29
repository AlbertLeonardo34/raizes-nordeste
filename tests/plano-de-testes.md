# Plano de Testes — Raízes do Nordeste API
## Coleção Postman / Insomnia — Cenários Mínimos (≥10)

### Ambiente
- Base URL: `http://localhost:3000/api/v1`
- Token: obtido via POST /auth/login, enviado como `Authorization: Bearer <token>`

---

| ID  | Cenário | Endpoint | Pré-condição | Entrada | Esperado | Tipo |
|-----|---------|----------|-------------|---------|---------|------|
| T01 | Login válido | POST /auth/login | Usuário seed existente | `{email, senha}` | 200 + accessToken | Positivo |
| T02 | Login senha inválida | POST /auth/login | Usuário seed existente | `{email, senhaErrada}` | 401 + CREDENCIAIS_INVALIDAS | Negativo |
| T03 | Acesso sem token | GET /pedidos | — | Sem header Authorization | 401 + NAO_AUTENTICADO | Negativo |
| T04 | Acesso com perfil errado | POST /estoque/*/movimentar | Token CLIENTE | Token de CLIENTE | 403 + SEM_PERMISSAO | Negativo |
| T05 | Criar pedido válido (APP) | POST /pedidos | Usuário CLIENTE logado, estoque disponível | `{unidadeId, canalPedido: "APP", itens, formaPagamento: "PIX"}` | 201 + pedidoId + status + pagamento APROVADO | Positivo |
| T06 | Criar pedido sem estoque | POST /pedidos | CLIENTE logado, produto com estoque=0 | `{itens: [{produtoId, quantidade: 999}]}` | 409 + CONFLITO | Negativo |
| T07 | Criar pedido sem canalPedido | POST /pedidos | CLIENTE logado | `{sem canalPedido}` | 422 + VALIDACAO_INVALIDA | Negativo |
| T08 | Pagamento mock recusado | POST /pedidos | CLIENTE logado, estoque ok | `{formaPagamento: "RECUSADO_MOCK"}` | 201 + status CANCELADO + pagamento RECUSADO | Negativo |
| T09 | Listar pedidos por canal | GET /pedidos?canalPedido=APP | GERENTE logado | Query canalPedido=APP | 200 + lista paginada filtrada | Positivo |
| T10 | Atualizar status do pedido | PATCH /pedidos/:id/status | GERENTE logado, pedido existe | `{status: "EM_PREPARO"}` | 200 + statusAnterior + novoStatus | Positivo |
| T11 | Cardápio por unidade | GET /unidades/:id/cardapio | Unidade seed existe | Path: unidadeId válido | 200 + lista de produtos disponíveis | Positivo |
| T12 | Movimentar estoque (entrada) | POST /estoque/:unidadeId/movimentar | GERENTE logado | `{produtoId, tipo: "ENTRADA", quantidade: 10, motivo}` | 200 + saldoAtual atualizado | Positivo |
| T13 | Registrar usuário sem LGPD | POST /auth/registrar | — | `{...dados, consentimentoLGPD: false}` | 422 + VALIDACAO_INVALIDA | Negativo |
| T14 | Consultar fidelidade | GET /fidelidade/:clienteId | CLIENTE logado | clienteId do próprio usuário | 200 + pontos + histórico | Positivo |

---

## Estrutura da Coleção Postman

```
Raízes do Nordeste API/
├── Auth/
│   ├── T01 - Login válido
│   ├── T02 - Login senha inválida
│   └── T13 - Registrar sem LGPD
├── Pedidos/
│   ├── T03 - Sem token
│   ├── T04 - Perfil errado
│   ├── T05 - Criar pedido APP
│   ├── T06 - Sem estoque
│   ├── T07 - Sem canalPedido
│   ├── T08 - Pagamento recusado
│   ├── T09 - Listar por canal
│   └── T10 - Atualizar status
├── Unidades/
│   └── T11 - Cardápio por unidade
├── Estoque/
│   └── T12 - Movimentar entrada
└── Fidelidade/
    └── T14 - Consultar pontos
```
