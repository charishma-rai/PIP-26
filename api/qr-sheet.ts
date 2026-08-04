import type { VercelRequest, VercelResponse } from '@vercel/node';
import ROOMS from '../lib/data/rooms.json';

const PRINTABLE_LOCATIONS = [
  'entrance_west',
  'entrance_south',
  'help_desk',
  'admission_section',
  'seminar_hall',
  'academic_section',
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  const itemsHtml = PRINTABLE_LOCATIONS.map((id) => {
    const room = ROOMS.find((r) => r.id === id);
    const label = room ? room.name : id;
    const qrApiUrl = `${baseUrl}/api/qr/${id}`;
    const targetUrl = `${baseUrl}/?loc=${id}`;

    return `
      <div class="qr-card">
        <div class="qr-box">
          <img src="${qrApiUrl}" alt="QR code for ${label}" />
        </div>
        <div class="qr-label">${label}</div>
        <div class="qr-sub">Scan to start route here</div>
        <div class="qr-url">${targetUrl}</div>
      </div>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pip's Way - Printable Location QR Codes</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Quicksand:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --ink: #4A4258;
      --lav: #F1E9FB;
      --pink-deep: #E8A0BF;
      --lilac-deep: #B79CE0;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Quicksand', sans-serif;
      color: var(--ink);
      background: #faf8fd;
      margin: 0;
      padding: 24px;
    }
    .header {
      text-align: center;
      max-width: 800px;
      margin: 0 auto 28px;
    }
    .header h1 {
      font-family: 'Baloo 2', sans-serif;
      font-size: 28px;
      margin: 0 0 8px;
      color: var(--ink);
    }
    .header p {
      margin: 0 0 16px;
      color: #6b6278;
      font-size: 14px;
      font-weight: 600;
    }
    .print-btn {
      background: linear-gradient(135deg, var(--pink-deep), var(--lilac-deep));
      color: #fff;
      border: none;
      font-family: 'Baloo 2', sans-serif;
      font-size: 16px;
      font-weight: 700;
      padding: 10px 24px;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(183,156,224,0.4);
      transition: transform 0.15s ease;
    }
    .print-btn:hover {
      transform: translateY(-1px);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      max-width: 900px;
      margin: 0 auto;
    }
    .qr-card {
      background: #fff;
      border: 2px solid #f0e6f7;
      border-radius: 18px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 4px 16px rgba(120,90,150,0.08);
      page-break-inside: avoid;
    }
    .qr-box img {
      width: 150px;
      height: 150px;
      display: block;
      margin: 0 auto;
      border-radius: 8px;
    }
    .qr-label {
      font-family: 'Baloo 2', sans-serif;
      font-size: 17px;
      font-weight: 700;
      margin-top: 12px;
      color: var(--ink);
    }
    .qr-sub {
      font-size: 12px;
      font-weight: 600;
      color: #8A8296;
      margin-top: 2px;
    }
    .qr-url {
      font-size: 10px;
      color: #b0a8bd;
      margin-top: 6px;
      word-break: break-all;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .header p, .print-btn { display: none; }
      .grid { grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .qr-card { border: 1px solid #ccc; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🐣 Pip's Way · Location QR Sheet</h1>
    <p>Print these location tags and place them at matching spots across campus. Visitors scanning a QR tag will instantly start navigation from that location.</p>
    <button class="print-btn" onclick="window.print()">🖨️ Print QR Sheet</button>
  </div>
  <div class="grid">
    ${itemsHtml}
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
