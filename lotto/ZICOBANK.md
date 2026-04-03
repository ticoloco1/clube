# Pacote `lotto.zip` → ZicoBank / TrustBank

Os ficheiros JSX/JS originais ficam nesta pasta como referência. A integração ativa na app Next.js está em:

| Original | Integrado |
|----------|-----------|
| `LotteryGenerator.jsx` | `src/components/mystic/LotteryGenerator.tsx` |
| `TarotReader.jsx` | `src/components/mystic/TarotReader.tsx` |
| `AdminMysticLottery.jsx` | `src/components/mystic/AdminMysticLottery.tsx` |
| `database-schema.sql` | `supabase-mystic-lottery.sql` (UUID + RLS) |
| `backend-api.js` | Ainda não portado — usar rotas Next + Supabase quando precisares de persistência |

**Rotas públicas**

- `/mistico` — índice
- `/mistico/tarot` — tarô (entretenimento)
- `/mistico/loteria` — gerador de números
- `/mistico/config` — painel de módulos (login obrigatório)

**Admin:** separador “Místico / Loteria” em `/admin`.

O painel “Guardar preferências” grava em `localStorage` até ligares às tabelas do Supabase (`supabase-mystic-lottery.sql`).
