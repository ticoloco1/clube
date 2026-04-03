# 🔮 Sistema de Tarô e Loterias - TrustBank/ZicoBank
## Documentação Completa de Integração

---

## 📋 Visão Geral

Sistema completo de **Artes Místicas** (Tarô, Numerologia, etc.) e **Prognósticos de Loterias** integrado ao painel TrustBank/ZicoBank para os usuários oferecerem em seus minisites.

---

## 🎯 Funcionalidades Principais

### 1. Painel Administrativo do Usuário
- ✅ Seleção de módulos místicos (10 opções, 3 incluídas)
- ✅ Seleção de loterias mundiais (40+ opções, 5 incluídas)
- ✅ Cálculo automático de custos adicionais
- ✅ Configuração visual intuitiva

### 2. Sistema de Loterias
- ✅ 40+ loterias mundiais (Brasil, EUA, Europa, Austrália)
- ✅ Geração com IA Normal (gratuita) e Premium (R$ 5/jogo)
- ✅ Análise de frequência e padrões
- ✅ Números quentes/frios
- ✅ Score de confiança

### 3. Sistema de Tarô
- ✅ 5 tipos de tiragem (1 carta, 3 cartas, Cruz Céltica, etc.)
- ✅ 22 cartas do Arcano Maior
- ✅ Interpretação com IA
- ✅ Categorias (Amor, Carreira, Espiritual, Financeiro, Geral)

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────┐
│           Painel Administrativo                 │
│  (AdminMysticLottery.jsx)                      │
│  - Configuração de módulos                      │
│  - Seleção de loterias                          │
│  - Gestão de custos                             │
└────────────┬────────────────────────────────────┘
             │
             ├─────────────┬──────────────┐
             ▼             ▼              ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│  Loteria Client │ │  Tarô Client │ │ Outros Móds  │
│ (LotteryGen.jsx)│ │(TarotReader) │ │  (Futuro)    │
└────────┬────────┘ └──────┬───────┘ └──────────────┘
         │                 │
         └────────┬────────┘
                  │
                  ▼
         ┌────────────────┐
         │   Backend API  │
         │(backend-api.js)│
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │   PostgreSQL   │
         │   Database     │
         └────────────────┘
```

---

## 📂 Estrutura de Arquivos

```
trustbank-system/
├── frontend/
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminMysticLottery.jsx      # Painel admin
│   │   ├── client/
│   │   │   ├── LotteryGenerator.jsx        # Interface loteria
│   │   │   └── TarotReader.jsx             # Interface tarô
│   │   └── common/
│   │       └── MysticNavigation.jsx        # Navegação
│   └── pages/
│       ├── admin-dashboard.jsx             # Dashboard admin
│       └── minisite/
│           ├── lottery.jsx                 # Página loteria
│           └── tarot.jsx                   # Página tarô
│
├── backend/
│   ├── routes/
│   │   └── mystic-lottery.js               # Rotas API
│   ├── controllers/
│   │   ├── lotteryController.js            # Lógica loteria
│   │   └── tarotController.js              # Lógica tarô
│   ├── services/
│   │   ├── aiService.js                    # Integração IA
│   │   └── lotteryAnalytics.js             # Análises
│   └── middleware/
│       └── checkLotteryAccess.js           # Validação acesso
│
├── database/
│   ├── migrations/
│   │   └── 001_create_mystic_lottery_tables.sql
│   └── seeds/
│       └── lottery_data.sql                # Dados loterias
│
└── docs/
    ├── API.md                              # Documentação API
    ├── INTEGRATION.md                      # Este arquivo
    └── USER_GUIDE.md                       # Guia usuário
```

---

## 🗄️ Banco de Dados

### Tabelas Principais

```sql
1. user_mystic_lottery_config
   - Configurações do usuário
   - Módulos e loterias selecionados
   - Custos adicionais

2. lottery_generation_history
   - Histórico de gerações
   - Jogos criados
   - Custos por geração

3. tarot_reading_history
   - Histórico de leituras
   - Cartas selecionadas
   - Interpretações

4. lottery_statistics
   - Dados históricos de sorteios
   - Para análises de IA Premium

5. mystic_lottery_transactions
   - Transações financeiras
   - Pagamentos e créditos
```

### Executar Schema

```bash
# 1. Conectar ao PostgreSQL
psql -U trustbank_user -d trustbank_db

# 2. Executar schema
\i database-schema.sql

# 3. Verificar tabelas criadas
\dt
```

---

## 🔌 Integração API

### Endpoints Principais

#### 1. Configuração do Usuário

**GET** `/api/user/:userId/mystic-lottery/config`
```json
{
  "success": true,
  "data": {
    "selected_mystic_modules": ["tarot", "numerology", "astrology"],
    "selected_lotteries": ["mega-sena", "quina", "lotofacil"],
    "additional_cost": 0.00
  }
}
```

**POST** `/api/user/:userId/mystic-lottery/config`
```json
{
  "selected_mystic_modules": ["tarot", "numerology", "astrology", "runes"],
  "selected_lotteries": ["mega-sena", "powerball", "euromillions"]
}
```

#### 2. Gerar Números de Loteria

**POST** `/api/lottery/generate`
```json
{
  "lottery_id": "mega-sena",
  "quantity": 3,
  "ai_mode": "premium",
  "user_id": 123,
  "client_id": 456
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "games": [
      {
        "numbers": [5, 12, 23, 34, 45, 56],
        "confidence": 87,
        "analysis": {
          "hotNumbers": [12, 23, 45],
          "pattern": "4 pares / 2 ímpares",
          "frequency": "Alta frequência nos últimos 30 sorteios"
        }
      }
    ],
    "cost": 15.00,
    "generated_at": "2026-04-03T10:30:00Z"
  }
}
```

#### 3. Leitura de Tarô

**POST** `/api/tarot/reading`
```json
{
  "spread_type": "3-cards",
  "question": "Como será meu futuro profissional?",
  "category": "career",
  "user_id": 123,
  "client_id": 456
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": 1,
        "name": "O Mago",
        "reversed": false,
        "position": 0,
        "meaning": "Manifestação, poder pessoal, ação"
      }
    ],
    "interpretation": "A energia atual sugere que O Mago no presente indica...",
    "timestamp": "2026-04-03T10:30:00Z"
  }
}
```

---

## 💰 Sistema de Precificação

### Módulos Místicos

| Módulo | Incluído | Custo Adicional |
|--------|----------|-----------------|
| Tarô | ✅ | - |
| Numerologia | ✅ | - |
| Astrologia | ✅ | - |
| Runas | ❌ | R$ 19,90/mês |
| I Ching | ❌ | R$ 19,90/mês |
| Búzios | ❌ | R$ 19,90/mês |
| Cristalomancia | ❌ | R$ 24,90/mês |
| Cartomancia | ❌ | R$ 19,90/mês |
| Quiromancia | ❌ | R$ 19,90/mês |
| Baralho Cigano | ❌ | R$ 24,90/mês |

### Loterias

| Quantidade | Custo |
|------------|-------|
| 5 loterias | Incluído |
| Cada adicional | US$ 15,00/mês |

### Geração com IA

| Modo | Custo por Jogo |
|------|----------------|
| IA Normal | Grátis |
| IA Premium | R$ 5,00 |

---

## 🚀 Instalação e Configuração

### 1. Backend

```bash
# Instalar dependências
cd backend
npm install express pg cors dotenv anthropic

# Configurar variáveis de ambiente
cp .env.example .env

# Editar .env
DATABASE_URL=postgresql://user:password@localhost:5432/trustbank
ANTHROPIC_API_KEY=sk-ant-xxxxx
PORT=3000
```

### 2. Frontend

```bash
# Instalar dependências
cd frontend
npm install react lucide-react

# Build
npm run build
```

### 3. Banco de Dados

```bash
# Criar banco
createdb trustbank_db

# Executar migrations
psql -U trustbank_user -d trustbank_db -f database-schema.sql
```

### 4. Integrar ao Sistema Existente

```javascript
// No seu arquivo principal de rotas (app.js ou index.js)
const mysticLotteryRoutes = require('./routes/mystic-lottery');

app.use('/api', mysticLotteryRoutes);
```

---

## 🔐 Segurança e Validações

### Middleware de Autenticação

```javascript
// middleware/auth.js
const checkAuth = async (req, res, next) => {
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado' });
  }
  
  // Validar token
  const user = await validateToken(token);
  req.user = user;
  next();
};
```

### Validação de Acesso

```javascript
// middleware/checkLotteryAccess.js
const checkLotteryAccess = async (req, res, next) => {
  const { lottery_id } = req.body;
  const userId = req.user.id;
  
  const hasAccess = await db.query(
    'SELECT check_lottery_access($1, $2)',
    [userId, lottery_id]
  );
  
  if (!hasAccess.rows[0].check_lottery_access) {
    return res.status(403).json({
      error: 'Você não tem acesso a esta loteria'
    });
  }
  
  next();
};
```

---

## 🤖 Integração com Claude AI (Anthropic)

### Configuração

```javascript
// services/aiService.js
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Gerar interpretação de Tarô
async function generateTarotInterpretation(cards, question, category) {
  const prompt = `
Você é um leitor de Tarô experiente. 

Pergunta do cliente: ${question}
Categoria: ${category}
Cartas selecionadas: ${JSON.stringify(cards)}

Forneça uma interpretação profunda e personalizada das cartas.
  `;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return message.content[0].text;
}

// Análise Premium de Loteria
async function analyzeLotteryNumbers(lotteryId, historicalData) {
  const prompt = `
Analise os dados históricos da loteria ${lotteryId} e sugira
os melhores números com base em:
- Frequência de aparição
- Padrões de distribuição
- Números quentes e frios
- Balanceamento par/ímpar

Dados históricos: ${JSON.stringify(historicalData)}
  `;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return parseAIResponse(message.content[0].text);
}
```

---

## 📊 Analytics e Relatórios

### Queries Úteis

```sql
-- Total de receita por usuário
SELECT 
  u.id,
  u.email,
  SUM(lgh.cost) as lottery_revenue,
  COUNT(lgh.id) as total_generations,
  COUNT(trh.id) as total_readings
FROM users u
LEFT JOIN lottery_generation_history lgh ON u.id = lgh.user_id
LEFT JOIN tarot_reading_history trh ON u.id = trh.user_id
GROUP BY u.id, u.email;

-- Loterias mais populares
SELECT 
  lottery_id,
  COUNT(*) as generations,
  SUM(cost) as revenue
FROM lottery_generation_history
GROUP BY lottery_id
ORDER BY generations DESC;

-- Performance por categoria de Tarô
SELECT 
  category,
  COUNT(*) as readings,
  spread_type
FROM tarot_reading_history
GROUP BY category, spread_type;
```

---

## 🎨 Customização de Minisite

### Adicionar ao Minisite do Usuário

```javascript
// pages/minisite/[username].jsx
import LotteryGenerator from '@/components/client/LotteryGenerator';
import TarotReader from '@/components/client/TarotReader';

export default function Minisite({ user, config }) {
  return (
    <div>
      {/* Outras seções do minisite */}
      
      {config.lottery_enabled && (
        <section id="lottery">
          <LotteryGenerator 
            userId={user.id}
            availableLotteries={config.selected_lotteries}
          />
        </section>
      )}
      
      {config.mystic_enabled && config.selected_mystic_modules.includes('tarot') && (
        <section id="tarot">
          <TarotReader 
            userId={user.id}
          />
        </section>
      )}
    </div>
  );
}
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Criar tabelas no banco de dados
- [ ] Implementar rotas da API
- [ ] Integrar com Claude API (Anthropic)
- [ ] Configurar middleware de autenticação
- [ ] Implementar sistema de cobrança
- [ ] Criar jobs para atualizar dados de loterias

### Frontend
- [ ] Integrar componentes ao painel admin
- [ ] Adicionar páginas ao minisite
- [ ] Implementar sistema de pagamento
- [ ] Criar dashboards de analytics
- [ ] Testes de responsividade

### Testes
- [ ] Testes unitários das funções
- [ ] Testes de integração da API
- [ ] Testes E2E do fluxo completo
- [ ] Testes de carga (performance)

### Deploy
- [ ] Configurar variáveis de ambiente
- [ ] Deploy do backend
- [ ] Deploy do frontend
- [ ] Configurar CDN para assets
- [ ] Monitoramento e logs

---

## 🐛 Troubleshooting

### Problemas Comuns

**1. Erro de permissão no banco**
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trustbank_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO trustbank_user;
```

**2. Claude API não responde**
- Verificar API key válida
- Checar limites de rate limit
- Validar formato do prompt

**3. Geração de números incorreta**
- Verificar configuração da loteria
- Validar ranges de números
- Checar lógica de bônus/estrelas

---

## 📞 Suporte e Contato

Para dúvidas sobre a integração:
- Email: suporte@trustbank.xyz
- Discord: TrustBank Community
- Documentação: https://docs.trustbank.xyz

---

## 📝 Changelog

### v1.0.0 (2026-04-03)
- ✅ Lançamento inicial
- ✅ Sistema de loterias com IA
- ✅ Sistema de Tarô completo
- ✅ Painel administrativo
- ✅ 40+ loterias mundiais
- ✅ Integração com Claude AI

---

**Desenvolvido para TrustBank/ZicoBank** 🚀
