#!/usr/bin/env bash
# Gera supabase-patches-only.sql — tudo EXCETO supabase-schema-completo.sql.
# Para quem já correu só o núcleo (completo) e não quer reaplicar o PASSO 0.
# Uso: bash scripts/build-supabase-patches-only.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/supabase-patches-only.sql"

FILES=(
  supabase-stripe-tables.sql
  supabase-slug-nft-thirdweb.sql
  supabase-mini-sites-multi-per-user.sql
  supabase-mini-sites-editor-columns.sql
  supabase-site-follows-ensure.sql
  supabase-stripe-connect-columns.sql
  supabase-lively-avatar.sql
  supabase-lively-floating-expressive.sql
  supabase-lively-profile-speaking.sql
  supabase-lively-tts-provider.sql
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
  echo "-- TrustBank — PATCHES ONLY (sem schema-completo, gerado automaticamente)"
  echo "-- Gerado por: scripts/build-supabase-patches-only.sh"
  echo "-- Data: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "--"
  echo "-- Usa quando JÁ tens supabase-schema-completo.sql aplicado e queres o resto"
  echo "-- num único paste (não apaga o schema public)."
  echo "--"
  echo "-- Se ainda não tens o núcleo: corre primeiro supabase-schema-completo.sql,"
  echo "-- ou usa supabase-all-in-one.sql num projeto NOVO (apaga public)."
  echo "--"
  echo "-- Depois: supabase-validacao-schema.sql"
  echo "-- Storage: bucket 'platform-assets' no Dashboard se necessário."
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
