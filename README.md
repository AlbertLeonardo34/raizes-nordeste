# 🌵 Raízes do Nordeste — API Back-End

> **Projeto Multidisciplinar — UNINTER — Trilha Back-End**

---

## ✅ Pré-requisitos

| Ferramenta | Versão | Download |
|------------|--------|----------|
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 14+ | https://www.postgresql.org/download |
| Git | qualquer | https://git-scm.com |

---

## 🚀 Passo a passo completo (VSCode)

### 1. Clonar / abrir o projeto

```bash
# Extraia o ZIP e abra a pasta no VSCode
# File > Open Folder > selecione a pasta raizes-nordeste
```

### 2. Abrir o terminal integrado

```
Menu: Terminal > New Terminal   (ou Ctrl + `)
```

### 3. Instalar dependências

```bash
npm install
```

### 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Abra o arquivo `.env` e edite:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/raizes_nordeste?schema=public"
JWT_SECRET=raizes_nordeste_secret_key_2026_super_segura
JWT_EXPIRES_IN=24h
```

> ⚠️ Troque `SUA_SENHA` pela senha do seu PostgreSQL.

### 5. Criar o banco de dados

Abra o **pgAdmin** ou o **psql** e execute:

```sql
CREATE DATABASE raizes_nordeste;
```

Ou via terminal:

```bash
psql -U postgres -c "CREATE DATABASE raizes_nordeste;"
```

### 6. Gerar o Prisma Client

```bash
npx prisma generate
```

### 7. Executar as migrations (cria as tabelas)

```bash
npx prisma migrate dev --name init
```

### 8. Popular o banco com dados de teste (seed)

```bash
npm run prisma:seed
```

Saída esperada:
```
✅ Seed concluído com sucesso!
👤 Usuários criados:
  Admin:   admin@raizesnordeste.com  / Senha@123
  Gerente: gerente@raizesnordeste.com / Senha@123
  Cliente: cliente@exemplo.com        / Senha@123
🏪 Unidades: Recife Centro, Fortaleza
🍽️  Produtos: 7 criados
```

### 9. Iniciar a API

```bash
npm run dev
```

Saída esperada:
```
✅ Conectado ao banco de dados PostgreSQL
🚀 Raízes do Nordeste API rodando na porta 3000
📚 Swagger disponível em: http://localhost:3000/api/docs
🔧 Health check: http://localhost:3000/health
```

### 10. Testar se está funcionando

Abra o navegador em: **http://localhost:3000/health**

Deve retornar:
```json
{ "status": "UP", "timestamp": "...", "environment": "development" }
```

---

## 📚 Documentação Swagger

Acesse: **http://localhost:3000/api/docs**

**Como autenticar:**
1. Clique em `POST /auth/login` → `Try it out`
2. Use: `{ "email": "cliente@exemplo.com", "senha": "Senha@123" }`
3. Copie o `accessToken` da resposta
4. Clique em **Authorize** (🔒 no topo)
5. Cole o token e clique em **Authorize**

---

## 🔗 Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /api/v1/auth/registrar | Público | Registrar cliente |
| POST | /api/v1/auth/login | Público | Login / token |
| GET | /api/v1/auth/perfil | JWT | Dados do usuário |
| GET | /api/v1/unidades | Público | Listar unidades |
| GET | /api/v1/unidades/:id/cardapio | Público | Cardápio por unidade |
| **POST** | **/api/v1/pedidos** | JWT/CLIENTE | **Criar pedido (fluxo crítico)** |
| GET | /api/v1/pedidos | JWT | Listar pedidos |
| GET | /api/v1/pedidos/:id | JWT | Buscar pedido |
| PATCH | /api/v1/pedidos/:id/status | JWT/GERENTE+ | Atualizar status |
| GET | /api/v1/estoque/:unidadeId | JWT/GERENTE+ | Estoque por unidade |
| POST | /api/v1/estoque/:unidadeId/movimentar | JWT/GERENTE+ | Entrada/saída |
| GET | /api/v1/fidelidade/:clienteId | JWT | Pontos de fidelidade |
| POST | /api/v1/fidelidade/:clienteId/resgatar | JWT/CLIENTE | Resgatar pontos |

---

## 🧪 Testando com Postman

### Cenário 1 — Login
```
POST http://localhost:3000/api/v1/auth/login
Body: { "email": "cliente@exemplo.com", "senha": "Senha@123" }
Esperado: 200 + accessToken
```

### Cenário 2 — Criar pedido (fluxo crítico)
```
POST http://localhost:3000/api/v1/pedidos
Header: Authorization: Bearer <token>
Body:
{
  "unidadeId": "<id da unidade do seed>",
  "canalPedido": "APP",
  "itens": [{ "produtoId": "<id do produto>", "quantidade": 1 }],
  "formaPagamento": "PIX"
}
Esperado: 201 + status EM_PREPARO + pagamento APROVADO
```

### Cenário 3 — Pagamento recusado (teste negativo)
```
Mesmo body, mas: "formaPagamento": "RECUSADO_MOCK"
Esperado: 201 + status CANCELADO + pagamento RECUSADO
```

### Cenário 4 — Sem token (teste negativo)
```
GET http://localhost:3000/api/v1/pedidos  (sem header Authorization)
Esperado: 401 NAO_AUTENTICADO
```

---

## 🗂️ Estrutura do projeto

```
src/
├── domain/errors/          # AppError e tipos de erro
├── application/use-cases/  # Regras de negócio
├── infrastructure/
│   ├── auth/               # JWT
│   ├── database/prisma/    # Prisma client
│   ├── logging/            # Logger + Auditoria
│   └── payment/            # Pagamento mock
└── api/
    ├── controllers/        # HTTP handlers
    ├── middlewares/        # Auth + ErrorHandler
    ├── routes/             # Rotas + Swagger JSDoc
    └── swagger/            # Config OpenAPI
prisma/
├── schema.prisma           # DER do banco
└── seed.ts                 # Dados iniciais
```

---

## 👥 Perfis e permissões

| Perfil | Pode fazer |
|--------|-----------|
| CLIENTE | Criar pedidos, ver seus pedidos, fidelidade |
| ATENDENTE | Ver pedidos, atualizar status, ver estoque |
| COZINHA | Atualizar status de pedidos |
| GERENTE | Tudo acima + movimentar estoque |
| ADMIN | Acesso total |

---

## 🔒 LGPD

- Consentimento explícito obrigatório no cadastro
- Senhas com bcrypt (salt 10) — nunca expostas em responses
- Auditoria de todas as ações sensíveis em banco
- Cliente só acessa seus próprios dados de fidelidade

---

## 🛠️ Scripts disponíveis

```bash
npm run dev           # Inicia em modo desenvolvimento (hot-reload)
npm run build         # Compila TypeScript
npm start             # Inicia versão compilada
npx prisma generate   # Gera Prisma Client
npx prisma migrate dev --name init  # Executa migrations
npm run prisma:seed   # Popula banco com dados de teste
npx prisma studio     # Interface visual do banco (http://localhost:5555)
```
