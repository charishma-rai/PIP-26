import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRoute } from '../lib/graph';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { from, to } = req.query;

  if (!from || !to || typeof from !== 'string' || typeof to !== 'string') {
    return res.status(400).json({ error: 'Query parameters "from" and "to" are required strings' });
  }

  const route = getRoute(from, to);

  if (!route) {
    return res.status(404).json({ error: 'No route found between specified locations' });
  }

  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  return res.status(200).json(route);
}
