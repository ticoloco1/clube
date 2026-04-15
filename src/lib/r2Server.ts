import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

function clean(v: string) {
  return String(v || '').trim();
}

function sanitizePart(v: string) {
  return clean(v).replace(/[^a-z0-9/_-]/gi, '_').replace(/\/+/g, '/').replace(/^\/+|\/+$/g, '');
}

export function getR2PublicBaseUrl(): string {
  const explicit = clean(process.env.R2_PUBLIC_BASE_URL).replace(/\/+$/, '');
  if (explicit) return explicit;
  const accountId = clean(process.env.R2_ACCOUNT_ID);
  return accountId ? `https://pub-${accountId}.r2.dev` : '';
}

function getR2Client() {
  const accountId = clean(process.env.R2_ACCOUNT_ID);
  const accessKeyId = clean(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey = clean(process.env.R2_SECRET_ACCESS_KEY);
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function putBufferToR2(opts: {
  key: string;
  body: Buffer;
  contentType?: string;
  cacheControl?: string;
}): Promise<string> {
  const bucket = clean(process.env.R2_BUCKET);
  const base = getR2PublicBaseUrl();
  const client = getR2Client();
  if (!bucket || !base || !client) throw new Error('R2 server env missing');

  const key = sanitizePart(opts.key);
  if (!key) throw new Error('Invalid R2 key');

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: opts.body,
      ContentType: opts.contentType || 'application/octet-stream',
      CacheControl: opts.cacheControl || 'public, max-age=31536000, immutable',
    }),
  );

  return `${base}/${key}`;
}
