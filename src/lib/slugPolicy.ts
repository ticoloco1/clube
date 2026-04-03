import { getReservedSlugSet } from './slugReservedLists';
import { isWorldFirstNameSlug } from './worldFirstNames';

/**
 * Tarifa especial nome (lista mundial): só entra se o preço **só por nº de letras**
 * for **menor** que este valor. Hoje os tiers 1–7 são todos ≥ $2000, logo prevalece sempre o preço por letras.
 */
export const SLUG_WORLD_NAME_TIER_USD = 500;

/** 2.º slug e seguintes: registo US$ (com plano / mini-site já existente). */
export const SLUG_EXTRA_REGISTRATION_USD = 7;

/** Renovação anual por slug (carrinho). */
export const SLUG_RENEWAL_ANNUAL_USD = 7;

export function normalizeSlugKey(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Slug só pode ser registado pelo admin (país, cidade, termo bancário, etc.). */
export function isSlugReservedAdminOnly(slug: string): boolean {
  const key = normalizeSlugKey(slug);
  if (!key) return true;
  return getReservedSlugSet().has(key);
}

/** Preço só pelo nº de caracteres (1–7 premium; 8+ = 0 aqui). */
export function slugLengthTierByLenOnly(len: number): number {
  if (len <= 0) return 0;
  if (len <= 1) return 5000;
  if (len === 2) return 4500;
  if (len === 3) return 4000;
  if (len === 4) return 3500;
  if (len === 5) return 3000;
  if (len === 6) return 2500;
  if (len === 7) return 2000;
  return 0;
}

/**
 * Preço por comprimento (1–7): **sempre** respeita a tabela por letras se esse valor ≥ $500.
 * Nome na lista mundial: só ajusta para $500 se o tier por letras for menor que $500 (hoje não ocorre em 1–7).
 * 8+ não reservados: 0 nesta função; slug extra = SLUG_EXTRA no `slugRegistrationDueUsd`.
 */
export function slugLengthTierUsd(slug: string): number {
  const key = normalizeSlugKey(slug);
  const len = key.length;
  if (len <= 0) return 0;
  const byLen = slugLengthTierByLenOnly(len);
  if (len <= 7 && isWorldFirstNameSlug(key) && byLen < SLUG_WORLD_NAME_TIER_USD) {
    return SLUG_WORLD_NAME_TIER_USD;
  }
  return byLen;
}

export { isWorldFirstNameSlug } from './worldFirstNames';

/**
 * Valor a cobrar no registo (não inclui reservados — tratar à parte).
 * @param existingSlugRegistrationCount número de linhas em slug_registrations do utilizador
 */
export function slugRegistrationDueUsd(slug: string, existingSlugRegistrationCount: number): number {
  if (isSlugReservedAdminOnly(slug)) return 0;
  const tier = slugLengthTierUsd(slug);
  if (tier > 0) return tier;
  return existingSlugRegistrationCount > 0 ? SLUG_EXTRA_REGISTRATION_USD : 0;
}

/** Compat: nome antigo usado no projeto. */
export function slugPrice(slug: string, existingSlugRegistrationCount = 0): number {
  return slugRegistrationDueUsd(slug, existingSlugRegistrationCount);
}
