# 🔮 Sistema de Tarô & Loterias - TrustBank/ZicoBank

Sistema completo de **Artes Místicas** e **Prognósticos de Loterias** com IA integrado ao TrustBank/ZicoBank.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.x-61DAFB.svg)
![Node](https://img.shields.io/badge/Node-18.x-339933.svg)

---

## 📋 Visão Geral

Permite que usuários do TrustBank ofereçam serviços místicos e de loterias em seus minisites, com dois sistemas principais:

### 🎰 Sistema de Loterias
- **40+ loterias mundiais** (Brasil, EUA, Europa, Austrália)
- **IA Normal** (gratuita) e **IA Premium** (R$ 5/jogo)
- Análise estatística avançada
- Números quentes/frios
- Score de confiança

### 🔮 Sistema de Tarô
- **10 módulos místicos** (Tarô, Numerologia, Astrologia, etc.)
- **5 tipos de tiragem** (1 carta, 3 cartas, Cruz Céltica, etc.)
- Interpretação com IA Claude (Anthropic)
- Categorias especializadas

---

## 🚀 Funcionalidades

### Para o Usuário (Dono do Minisite)
✅ Painel de configuração visual  
✅ Escolha de 10 módulos místicos (3 incluídos, outros R$ 19,90-24,90/mês)  
✅ Seleção de 40+ loterias (5 incluídas, outras US$ 15/mês)  
✅ Cálculo automático de custos  
✅ Analytics e relatórios  

### Para o Cliente Final
✅ Interface intuitiva de geração de números  
✅ Leitura de Tarô interativa  
✅ Múltiplos modos de IA  
✅ Histórico de consultas  
✅ Download e compartilhamento  

---

## 📦 Estrutura do Projeto

```
📁 Arquivos Criados:
├── AdminMysticLottery.jsx          # Painel administrativo
├── LotteryGenerator.jsx            # Interface de loteria para cliente
├── TarotReader.jsx                 # Interface de Tarô para cliente
├── backend-api.js                  # API backend completa
├── database-schema.sql             # Schema do banco de dados
├── claudeAIService.js              # Serviço de integração com Claude AI
├── INTEGRATION_GUIDE.md            # Guia completo de integração
└── README.md                       # Este arquivo
```

---

## ⚙️ Instalação Rápida

### 1. Pré-requisitos

```bash
Node.js >= 18.x
PostgreSQL >= 14.x
NPM ou Yarn
Conta Anthropic (API Key)
```

### 2. Banco de Dados

```bash
# Criar banco
createdb trustbank_db

# Executar schema
psql -U seu_usuario -d trustbank_db -f database-schema.sql
```

### 3. Backend

```bash
# Instalar dependências
npm install express pg cors dotenv @anthropic-ai/sdk

# Configurar .env
cat > .env << EOF
DATABASE_URL=postgresql://usuario:senha@localhost:5432/trustbank_db
ANTHROPIC_API_KEY=sk-ant-seu-key-aqui
PORT=3000
NODE_ENV=production
EOF

# Iniciar servidor
node server.js
```

### 4. Frontend

```bash
# Instalar dependências
npm install react lucide-react

# Build
npm run build
```

---

## 🔌 Integração ao Sistema Existente

### Adicionar Rotas no Backend

```javascript
// server.js ou app.js
const mysticLotteryRoutes = require('./routes/mystic-lottery');

app.use('/api', mysticLotteryRoutes);
```

### Adicionar ao Painel Admin

```javascript
// pages/admin/dashboard.jsx
import AdminMysticLottery from '@/components/AdminMysticLottery';

export default function Dashboard() {
  return (
    <div>
      {/* Menu existente */}
      <AdminMysticLottery />
    </div>
  );
}
```

### Adicionar ao Minisite do Usuário

```javascript
// pages/minisite/[username].jsx
import LotteryGenerator from '@/components/LotteryGenerator';
import TarotReader from '@/components/TarotReader';

export default function Minisite({ user, config }) {
  return (
    <div>
      {config.lottery_enabled && (
        <LotteryGenerator userId={user.id} />
      )}
      
      {config.mystic_enabled && (
        <TarotReader userId={user.id} />
      )}
    </div>
  );
}
```

---

## 📡 API Endpoints

### Configuração

**GET** `/api/user/:userId/mystic-lottery/config`
```bash
curl http://localhost:3000/api/user/123/mystic-lottery/config
```

**POST** `/api/user/:userId/mystic-lottery/config`
```bash
curl -X POST http://localhost:3000/api/user/123/mystic-lottery/config \
  -H "Content-Type: application/json" \
  -d '{
    "selected_mystic_modules": ["tarot", "numerology", "runes"],
    "selected_lotteries": ["mega-sena", "powerball"]
  }'
```

### Loteria

**POST** `/api/lottery/generate`
```bash
curl -X POST http://localhost:3000/api/lottery/generate \
  -H "Content-Type: application/json" \
  -d '{
    "lottery_id": "mega-sena",
    "quantity": 3,
    "ai_mode": "premium",
    "user_id": 123
  }'
```

### Tarô

**POST** `/api/tarot/reading`
```bash
curl -X POST http://localhost:3000/api/tarot/reading \
  -H "Content-Type: application/json" \
  -d '{
    "spread_type": "3-cards",
    "question": "Como será meu futuro?",
    "category": "general",
    "user_id": 123
  }'
```

---

## 💰 Modelo de Precificação

### Plano Base
- ✅ 3 módulos místicos incluídos
- ✅ 5 loterias incluídas
- ✅ Geração com IA Normal (grátis)

### Custos Adicionais

| Item | Preço |
|------|-------|
| Módulo místico adicional | R$ 19,90-24,90/mês |
| Loteria adicional | US$ 15,00/mês |
| Geração IA Premium | R$ 5,00/jogo |

### Exemplo de Cálculo

```
Plano Base:           R$ 0,00
+ 2 módulos extras:   R$ 39,80/mês
+ 3 loterias extras:  US$ 45,00/mês (≈R$ 247,50)
--------------------------------
TOTAL MENSAL:         R$ 287,30/mês

Geração Premium:
10 jogos × R$ 5,00 = R$ 50,00 (sob demanda)
```

---

## 🎨 Screenshots

### Painel Administrativo
```
┌─────────────────────────────────────────┐
│  Módulos Místicos & Loterias            │
│  Configure os serviços do seu minisite  │
├─────────────────────────────────────────┤
│                                         │
│  [Artes Místicas] [Loterias Mundiais] │
│                                         │
│  🔮 Tarô          ✓ Incluído           │
│  🔢 Numerologia   ✓ Incluído           │
│  ⭐ Astrologia    ✓ Incluído           │
│  ᚱ  Runas         R$ 19,90/mês         │
│  ...                                    │
│                                         │
│  Custo Total: R$ 287,30/mês            │
│  [Salvar Configurações]                 │
└─────────────────────────────────────────┘
```

### Interface de Loteria
```
┌─────────────────────────────────────────┐
│  🎰 Gerador de Números com IA           │
├─────────────────────────────────────────┤
│  Loteria: [Mega-Sena ▼]                │
│  Modo IA: [⚡ Premium]                  │
│  Jogos:   [- 3 +]                       │
│                                         │
│  [✨ Gerar Números]                     │
├─────────────────────────────────────────┤
│  Jogo #1 - 87% confiança               │
│  [05] [12] [23] [34] [45] [56]        │
│  Análise: Alta frequência...            │
└─────────────────────────────────────────┘
```

---

## 🧪 Testes

### Testes Unitários
```bash
npm test
```

### Testes de Integração
```bash
npm run test:integration
```

### Testes E2E
```bash
npm run test:e2e
```

---

## 📊 Analytics

### Queries de Relatório

```sql
-- Top loterias por receita
SELECT 
  lottery_id,
  COUNT(*) as gerações,
  SUM(cost) as receita
FROM lottery_generation_history
GROUP BY lottery_id
ORDER BY receita DESC;

-- Usuários mais ativos
SELECT 
  u.email,
  COUNT(lgh.id) as loterias,
  COUNT(trh.id) as tarot
FROM users u
LEFT JOIN lottery_generation_history lgh ON u.id = lgh.user_id
LEFT JOIN tarot_reading_history trh ON u.id = trh.user_id
GROUP BY u.id, u.email
ORDER BY (loterias + tarot) DESC;
```

---

## 🔐 Segurança

### Variáveis de Ambiente
```bash
# .env.example
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=sua_chave_secreta
ENCRYPTION_KEY=sua_chave_criptografia
```

### Autenticação
- JWT tokens para API
- Rate limiting (100 req/min)
- Validação de acesso por plano
- Criptografia de dados sensíveis

---

## 🐛 Troubleshooting

### Problema: Erro de conexão com banco
```bash
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql

# Testar conexão
psql -U usuario -d trustbank_db -c "SELECT 1"
```

### Problema: API Claude não responde
```bash
# Verificar API key
echo $ANTHROPIC_API_KEY

# Testar com curl
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json"
```

### Problema: Números duplicados na loteria
```javascript
// Verificar validação no backend
validateGeneratedNumbers(numbers, config);
```

---

## 📚 Documentação Adicional

- [Guia de Integração Completo](./INTEGRATION_GUIDE.md)
- [Documentação da API](./docs/API.md)
- [Schema do Banco](./database-schema.sql)
- [Serviço de IA](./claudeAIService.js)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

---

## 📝 Changelog

### v1.0.0 (2026-04-03)
- ✅ Sistema de loterias com 40+ opções
- ✅ Sistema de Tarô completo
- ✅ Integração com Claude AI (Anthropic)
- ✅ Painel administrativo
- ✅ 10 módulos místicos
- ✅ Analytics e relatórios
- ✅ Sistema de pagamentos

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👥 Autores

- **TrustBank Team** - *Desenvolvimento inicial*
- **Claude (Anthropic)** - *Integração de IA*

---

## 🙏 Agradecimentos

- Anthropic pela API Claude
- Comunidade React
- PostgreSQL Team
- Todos os contribuidores

---

## 📞 Suporte

- 📧 Email: suporte@trustbank.xyz
- 💬 Discord: [TrustBank Community](https://discord.gg/trustbank)
- 📖 Docs: https://docs.trustbank.xyz
- 🐛 Issues: https://github.com/trustbank/mystic-lottery/issues

---

**Desenvolvido com 💜 para TrustBank/ZicoBank**

*Transforme seu minisite em uma experiência mística e lucrativa!* ✨
