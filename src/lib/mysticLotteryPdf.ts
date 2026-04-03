import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function buildLotteryReceiptPdf(params: {
  siteName: string;
  main: number[];
  stars: number[];
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  page.drawText('Recibo — Loteria premium (entretenimento)', {
    x: 50,
    y,
    size: 16,
    font: bold,
    color: rgb(0.08, 0.08, 0.1),
  });
  y -= 36;
  page.drawText(params.siteName, { x: 50, y, size: 13, font: bold, color: rgb(0.15, 0.15, 0.2) });
  y -= 32;
  page.drawText(`Números principais: ${params.main.join('  ·  ')}`, {
    x: 50,
    y,
    size: 12,
    font: bold,
    color: rgb(0.1, 0.1, 0.15),
  });
  y -= 22;
  const starsLine = params.stars.length ? params.stars.join('  ·  ') : '—';
  page.drawText(`Estrela(s): ${starsLine}`, {
    x: 50,
    y,
    size: 12,
    font: bold,
    color: rgb(0.1, 0.1, 0.15),
  });
  y -= 40;
  const disc =
    'Aviso: combinação gerada automaticamente para entretenimento. Não garante prémios nem substitui jogos oficiais. O pagamento foi processado na conta Stripe do criador deste perfil.';
  const words = disc.split(/\s+/);
  let line = '';
  const lines: string[] = [];
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (test.length > 85) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  for (const ln of lines) {
    page.drawText(ln, { x: 50, y, size: 9, font: regular, color: rgb(0.25, 0.25, 0.3) });
    y -= 12;
  }

  return doc.save();
}
