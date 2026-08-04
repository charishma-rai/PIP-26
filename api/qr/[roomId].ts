import type { VercelRequest, VercelResponse } from '@vercel/node';
import QRCode from 'qrcode';
import ROOMS from '../../lib/data/rooms.json';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { roomId } = req.query;
  const id = Array.isArray(roomId) ? roomId[0] : roomId;

  if (!id) {
    return res.status(400).send('Missing roomId parameter');
  }

  const roomExists = ROOMS.some((r) => r.id === id);
  if (!roomExists) {
    return res.status(404).send('Room not found');
  }

  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const deepLink = `${protocol}://${host}/?loc=${encodeURIComponent(id)}`;

  try {
    const pngBuffer = await QRCode.toBuffer(deepLink, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#4A4258',
        light: '#FFFFFF',
      },
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).send(pngBuffer);
  } catch (err) {
    console.error('QR code generation error:', err);
    return res.status(500).send('Failed to generate QR code');
  }
}
