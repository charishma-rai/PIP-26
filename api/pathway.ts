import type { VercelRequest, VercelResponse } from '@vercel/node';
import PATHWAY from '../lib/data/pathway.json';
import COURTYARDS from '../lib/data/courtyards.json';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.status(200).json({
    pathway: PATHWAY,
    courtyards: COURTYARDS,
  });
}
