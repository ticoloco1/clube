/**
 * Mint ERC721 na Polygon após pagamento Stripe (slug registado / mercado / leilão).
 *
 * Contrato: coleção criada na Thirdweb (NFT Collection) ou qualquer ERC721 com
 * `mintTo(address to, string memory uri)` — o mesmo ABI que a Thirdweb usa no template TokenERC721.
 *
 * Env:
 *   POLYGON_SLUG_NFT_CONTRACT_ADDRESS — endereço do contrato na Polygon
 *   POLYGON_SLUG_NFT_MINTER_PRIVATE_KEY — chave da carteira com permissão de mint (0x…)
 *   POLYGON_RPC_URL — opcional; recomendado Alchemy/Infura (senão RPC público viem)
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import { getSiteBaseUrl } from '@/lib/siteBaseUrl';

/** ABI mínimo compatível com TokenERC721 / NFT Collection Thirdweb (mint com URI). */
const SLUG_NFT_MINT_ABI = [
  {
    name: 'mintTo',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [],
  },
] as const;

function validSecp256k1PrivateKey(pk: string): boolean {
  const t = pk.trim();
  const hex = t.startsWith('0x') || t.startsWith('0X') ? t.slice(2) : t;
  return /^[a-fA-F0-9]{64}$/.test(hex);
}

export function isSlugNftMintConfigured(): boolean {
  const addr = process.env.POLYGON_SLUG_NFT_CONTRACT_ADDRESS?.trim();
  const pk = process.env.POLYGON_SLUG_NFT_MINTER_PRIVATE_KEY?.trim();
  return !!addr && /^0x[a-fA-F0-9]{40}$/i.test(addr) && !!pk && validSecp256k1PrivateKey(pk);
}

export function isValidEvmAddress(s: string | null | undefined): s is string {
  return typeof s === 'string' && /^0x[a-fA-F0-9]{40}$/i.test(s.trim());
}

function normalizePrivateKey(pk: string): Hex {
  const t = pk.trim();
  const hex = (t.startsWith('0x') ? t : `0x${t}`) as Hex;
  return hex;
}

export function metadataUrlForTrustBankSlug(slug: string): string {
  const s = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  const base = getSiteBaseUrl().replace(/\/$/, '');
  return `${base}/api/nft/slug-metadata?slug=${encodeURIComponent(s)}`;
}

/**
 * Idempotente por (payment_ref, slug). Ignora se env não configurado ou sem carteira no checkout.
 */
export async function mintTrustBankSlugCertificateIfConfigured(
  db: SupabaseClient,
  params: {
    slug: string;
    recipient: string;
    userId: string;
    paymentRef: string;
  },
): Promise<{ ok: true; txHash: string } | { ok: false; reason: string }> {
  const { slug, recipient, userId, paymentRef } = params;
  const slugNorm = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
  if (!slugNorm) return { ok: false, reason: 'invalid_slug' };
  if (!isValidEvmAddress(recipient)) return { ok: false, reason: 'invalid_recipient' };

  if (!isSlugNftMintConfigured()) {
    return { ok: false, reason: 'mint_not_configured' };
  }

  const contractAddr = process.env.POLYGON_SLUG_NFT_CONTRACT_ADDRESS!.trim() as `0x${string}`;
  const pk = normalizePrivateKey(process.env.POLYGON_SLUG_NFT_MINTER_PRIVATE_KEY!);
  const rpcUrl = process.env.POLYGON_RPC_URL?.trim() || undefined;

  const ref = paymentRef.slice(0, 200);
  const tokenUri = metadataUrlForTrustBankSlug(slugNorm);

  const { data: existing } = await db
    .from('slug_nft_mints' as any)
    .select('tx_hash')
    .eq('payment_ref', ref)
    .eq('slug', slugNorm)
    .maybeSingle();
  if (existing && typeof (existing as { tx_hash?: string }).tx_hash === 'string' && (existing as { tx_hash: string }).tx_hash) {
    return { ok: true, txHash: (existing as { tx_hash: string }).tx_hash };
  }

  const { data: inserted, error: insErr } = await db
    .from('slug_nft_mints' as any)
    .insert({
      payment_ref: ref,
      slug: slugNorm,
      user_id: userId,
      recipient: recipient.trim().toLowerCase(),
      chain_id: 137,
      token_uri: tokenUri,
    })
    .select('id')
    .maybeSingle();

  if (insErr) {
    if (String((insErr as any).code) === '23505') {
      return { ok: false, reason: 'duplicate_mint_row' };
    }
    if ((insErr as any).message?.includes('slug_nft_mints') || (insErr as any).code === '42P01') {
      console.warn('[SlugNFT] tabela slug_nft_mints em falta — corre supabase-slug-nft-thirdweb.sql');
      return { ok: false, reason: 'table_missing' };
    }
    console.error('[SlugNFT] insert slug_nft_mints', insErr);
    return { ok: false, reason: 'db_insert_failed' };
  }

  const rowId = (inserted as { id?: string } | null)?.id;
  if (!rowId) {
    return { ok: false, reason: 'no_row_id' };
  }

  const account = privateKeyToAccount(pk);
  const transport = http(rpcUrl);
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport,
  });

  try {
    const hash = await walletClient.writeContract({
      address: contractAddr,
      abi: SLUG_NFT_MINT_ABI,
      functionName: 'mintTo',
      args: [recipient.trim() as `0x${string}`, tokenUri],
    });

    await db.from('slug_nft_mints' as any).update({ tx_hash: hash }).eq('id', rowId);

    console.log('[SlugNFT] minted', { slug: slugNorm, hash, recipient: recipient.slice(0, 12) });
    return { ok: true, txHash: hash };
  } catch (e) {
    await db.from('slug_nft_mints' as any).delete().eq('id', rowId);
    console.error('[SlugNFT] mint failed', e);
    return { ok: false, reason: e instanceof Error ? e.message : 'mint_failed' };
  }
}
