#!/usr/bin/env bash
# Gera um único supabase-all-in-one.sql para colar no SQL Editor do Supabase.
# Uso: bash scripts/build-supabase-all-in-one.sh
# Já tens só o completo? bash scripts/build-supabase-patches-only.sh → supabase-patches-only.sql
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/supabase-all-in-one.sql"

# Ordem: núcleo → patches → módulos. Idempotente (IF NOT EXISTS / DROP POLICY IF EXISTS).
# Exclui: supabase-schema-validation.sql (só leitura), supabase-additions.sql (subset do completo),
#         supabase-plan-pro-monthly-2999.sql (substituído por plan-pro-pricing),
#         supabase-mystic-sales.sql / mystic-results (só comentários / fundidos).
FILES=(
  supabase-schema-completo.sql
  supabase-stripe-tables.sql
  supabase-mini-sites-multi-per-user.sql
  supabase-mini-sites-editor-columns.sql
  supabase-stripe-connect-columns.sql
  supabase-lively-avatar.sql
  supabase-lively-floating-expressive.sql
  supabase-lively-profile-speaking.sql
  supabase-editor-seo-extra.sql
  supabase-ai-usd-budget.sql
  supabase-ai-free-usd-zero-default.sql
  supabase-analytics-dashboard.sql
  supabase-site-booking.sql
  supabase-magic-portrait-boost.sql
  supabase-mini-site-byok.sql
  supabase-minisite-mystic-tarot-loteria.sql
  supabase-mystic-lottery.sql
  supabase-slug-market-rpc.sql
  supabase-cv-contact-locked.sql
  supabase-plan-studio.sql
  supabase-deactivate-studio-plan.sql
  supabase-plan-pro-pricing.sql
  supabase-jackpot-disable.sql
  supabase-storage-platform-assets-public-read.sql
  supabase-storage-platform-assets-auth-upload.sql
)

{
  echo "-- ============================================================================="
  echo "-- TrustBank — ALL-IN-ONE (gerado automaticamente)"
  echo "-- Gerado por: scripts/build-supabase-all-in-one.sh"
  echo "-- Data: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "--"
  echo "-- ⚠️  CRÍTICO: o primeiro bloco (supabase-schema-completo.sql) contém PASSO 0 que"
  echo "--     APAGA todo o schema public (dados irreversíveis). Usa APENAS em projeto"
  echo "--     Supabase NOVO ou com backup. NÃO corras em produção com dados reais."
  echo "--"
  echo "-- Para BD já em uso: corre os .sql incrementais à mão (ver cabeçalho de"
  echo "--     supabase-schema-validation.sql), não este all-in-one."
  echo "--"
  echo "-- Depois: supabase-schema-validation.sql (só SELECTs)."
  echo "-- Storage: bucket 'platform-assets' no Dashboard + políticas (último bloco)."
  echo "-- ============================================================================="
} >"$OUT"

for rel in "${FILES[@]}"; do
  path="$ROOT/$rel"
  if [[ ! -f "$path" ]]; then
    echo "ERRO: ficheiro em falta: $rel" >&2
    exit 1
  fi
  {
    echo ""
    echo ""
    echo "-- ═══════════════════════════════════════════════════════════════════════════"
    echo "-- FILE: $rel"
    echo "-- ═══════════════════════════════════════════════════════════════════════════"
    echo ""
    cat "$path"
  } >>"$OUT"
done

echo "OK → $OUT ($(wc -l <"$OUT" | tr -d ' ') linhas)"
