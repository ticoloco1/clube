/**
 * Replicate — zsxkib/instant-id (InstantID / IP-Adapter face).
 * Requer REPLICATE_API_TOKEN e imagem pública (URL).
 */

const MODEL_PATH = process.env.REPLICATE_INSTANTID_MODEL?.trim() || 'zsxkib/instant-id';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runInstantIdPortrait(params: {
  imageUrl: string;
  prompt: string;
  negativePrompt: string;
}): Promise<{ outputUrl: string } | { error: string }> {
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  if (!token) {
    return { error: 'REPLICATE_API_TOKEN não configurado' };
  }

  const body = {
    input: {
      image: params.imageUrl,
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      ip_adapter_scale: Number(process.env.REPLICATE_INSTANTID_IP_SCALE) || 0.85,
      controlnet_conditioning_scale: Number(process.env.REPLICATE_INSTANTID_CTRL_SCALE) || 0.85,
      num_inference_steps: Number(process.env.REPLICATE_INSTANTID_STEPS) || 30,
    },
  };

  const create = await fetch(`https://api.replicate.com/v1/models/${MODEL_PATH}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const created = (await create.json()) as {
    id?: string;
    error?: string;
    detail?: string;
    status?: string;
  };

  if (!create.ok || !created.id) {
    const msg = created.error || created.detail || create.statusText || 'Falha ao criar predição';
    console.error('[replicateInstantId] create', create.status, msg);
    return { error: String(msg) };
  }

  const id = created.id;
  const deadline = Date.now() + 180_000;

  while (Date.now() < deadline) {
    const poll = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${token}` },
    });
    const j = (await poll.json()) as {
      status?: string;
      output?: unknown;
      error?: string;
    };

    if (j.status === 'succeeded') {
      const out = j.output;
      let url: string | null = null;
      if (typeof out === 'string') url = out;
      else if (Array.isArray(out) && typeof out[0] === 'string') url = out[0];
      if (url) return { outputUrl: url };
      return { error: 'Saída inválida do modelo' };
    }
    if (j.status === 'failed' || j.status === 'canceled') {
      return { error: j.error || 'Geração falhou' };
    }
    await sleep(1200);
  }

  return { error: 'Timeout ao gerar imagem' };
}
