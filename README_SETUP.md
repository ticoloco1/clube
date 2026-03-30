# 🏦 ZicoBank — Setup e Deployment

## ✅ Correções Aplicadas

Este projeto foi corrigido com as seguintes melhorias:

1. **Carrinho Centralizado** — Modal do carrinho agora está corretamente centralizado na viewport
2. **Salvamento de Dados** — Todos os campos agora são salvos corretamente no banco de dados
3. **Melhor Tratamento de Erros** — Logs detalhados para debugging

Veja `CHECKUP_REPORT.md` para detalhes completos.

---

## 🚀 Quick Start

### 1. Instalar Dependências
```bash
npm install
# ou
pnpm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
NEXT_PUBLIC_SITE_URL=https://seu-dominio.com

# Pagamentos (Helio)
HELIO_API_KEY=sua-chave-helio

# Opcional: Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=seu-google-client-id
```

### 3. Executar Localmente
```bash
npm run dev
# Acesse http://localhost:3000
```

### 4. Build para Produção
```bash
npm run build
npm run start
```

---

## 📦 Deploy na Vercel

### Opção 1: CLI
```bash
npm install -g vercel
vercel
```

### Opção 2: GitHub
1. Faça push do código para GitHub
2. Conecte o repositório na Vercel
3. Configure as variáveis de ambiente
4. Deploy automático

---

## 🗄️ Banco de Dados (Supabase)

### Criar Tabelas
Execute o SQL em `supabase-additions.sql` no editor SQL do Supabase:

```sql
-- Copie e cole o conteúdo de supabase-additions.sql
```

### Verificar RLS
Certifique-se de que Row Level Security está habilitado em todas as tabelas.

---

## 🔐 Segurança

- ✅ Nunca compartilhe `.env.local`
- ✅ Use variáveis de ambiente para chaves sensíveis
- ✅ Habilite RLS no Supabase
- ✅ Configure CORS corretamente

---

## 🐛 Troubleshooting

### Erro: "Not authenticated"
- Verifique se você está logado
- Limpe cookies e tente novamente

### Erro: "Failed to save"
- Verifique as variáveis de ambiente
- Verifique se as tabelas existem no Supabase
- Verifique os logs do console (F12)

### Modal não aparece
- Verifique se o CartModal está em Providers
- Verifique z-index no CSS

---

## 📚 Documentação

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://github.com/pmndrs/zustand)

---

## 📝 Estrutura do Projeto

```
src/
├── app/              # Páginas e rotas
├── components/       # Componentes React
│   ├── layout/       # Header, Footer, Providers
│   ├── ui/           # Componentes reutilizáveis
│   ├── editor/       # Editor de site
│   └── site/         # Componentes de site público
├── hooks/            # Hooks customizados
├── lib/              # Utilitários
├── store/            # Zustand stores
└── middleware.ts     # Middleware Next.js
```

---

## ✨ Features

- 🎨 30 temas diferentes
- 💳 Pagamentos em USDC (Polygon)
- 🔐 Autenticação segura
- 📱 Responsivo
- 🌍 Multi-idioma
- 🎥 Paywall de vídeos
- 📄 CV desbloqueável
- 🔗 Links customizados
- 📊 Analytics

---

**Última Atualização:** 30 de Março de 2026
