import type { VercelRequest, VercelResponse } from '@vercel/node';
import CATS from '../lib/data/categories.json';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.status(200).json(CATS);
}
