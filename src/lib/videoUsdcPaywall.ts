import { createClient } from '@supabase/supabase-js';
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  erc20Abi,
  getAddress,
  http,
  isAddress,
  parseUnits,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

export const POLYGON_CHAIN_ID = 137;
export const USDC_DECIMALS = 6;

function env(name: string): string {
  return process.env[name]?.trim() || '';
}

export function usdcContractAddress(): `0x${string}` {
  const v = env('NEXT_PUBLIC_POLYGON_USDC_CONTRACT');
  if (!isAddress(v)) throw new Error('NEXT_PUBLIC_POLYGON_USDC_CONTRACT inválido');
  return getAddress(v);
}

export function treasuryAddress(): `0x${string}` {
  const v = env('TRUSTBANK_POLYGON_TREASURY_ADDRESS');
  if (!isAddress(v)) throw new Error('TRUSTBANK_POLYGON_TREASURY_ADDRESS inválido');
  return getAddress(v);
}

function treasuryPk(): Hex {
  const v = env('TRUSTBANK_POLYGON_TREASURY_PRIVATE_KEY');
  if (!v) throw new Error('TRUSTBANK_POLYGON_TREASURY_PRIVATE_KEY ausente');
  return (v.startsWith('0x') ? v : `0x${v}`) as Hex;
}

export function getServiceDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export function publicPolygonClient() {
  return createPublicClient({
    chain: polygon,
    transport: http(env('POLYGON_RPC_URL') || undefined),
  });
}

export function usdcUnitsFromUsd(usd: number | string): bigint {
  const n = typeof usd === 'number' ? usd : Number(usd);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Valor USD inválido');
  return parseUnits(n.toFixed(2), USDC_DECIMALS);
}

export async function verifyUsdcTransferToTreasury(params: {
  txHash: `0x${string}`;
  from: string;
  expectedAmount: bigint;
}): Promise<boolean> {
  const client = publicPolygonClient();
  const receipt = await client.getTransactionReceipt({ hash: params.txHash });
  if (receipt.status !== 'success') return false;

  const usdc = usdcContractAddress();
  const fromAddr = getAddress(params.from);
  const toAddr = treasuryAddress();

  const logs = await client.getLogs({
    address: usdc,
    event: {
      type: 'event',
      name: 'Transfer',
      inputs: [
        { type: 'address', name: 'from', indexed: true },
        { type: 'address', name: 'to', indexed: true },
        { type: 'uint256', name: 'value', indexed: false },
      ],
    },
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });

  return logs.some((l) => {
    const args = l.args as { from?: `0x${string}`; to?: `0x${string}`; value?: bigint };
    return (
      !!args &&
      args.from &&
      args.to &&
      args.value !== undefined &&
      getAddress(args.from) === fromAddr &&
      getAddress(args.to) === toAddr &&
      args.value === params.expectedAmount
    );
  });
}

export async function payoutCreatorUsdc(params: {
  creatorWallet: string;
  amountUnits: bigint;
}): Promise<{ txHash: string }> {
  const to = getAddress(params.creatorWallet);
  if (params.amountUnits <= BigInt(0)) return { txHash: '' };

  const account = privateKeyToAccount(treasuryPk());
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: http(env('POLYGON_RPC_URL') || undefined),
  });
  const txHash = await walletClient.sendTransaction({
    to: usdcContractAddress(),
    data: encodeFunctionData({
      abi: erc20Abi,
      functionName: 'transfer',
      args: [to, params.amountUnits],
    }),
    value: BigInt(0),
  });
  return { txHash };
}
