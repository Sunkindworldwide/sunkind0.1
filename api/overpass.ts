export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const query = typeof req.body?.query === 'string' ? req.body.query : '';
    if (!query.trim()) {
      res.status(400).json({ error: 'Missing Overpass query' });
      return;
    }

    const upstream = await fetch('https://lz4.overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SunkindSolarApp/1.0',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (error) {
    console.error('Overpass proxy failed:', error);
    res.status(502).json({ error: 'Overpass proxy failed' });
  }
}
