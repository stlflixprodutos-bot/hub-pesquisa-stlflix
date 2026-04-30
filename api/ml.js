export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60');
 
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q is required' });
 
  try {
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(q)}&limit=25&sort=sold_quantity_desc`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Origin': 'https://www.mercadolivre.com.br',
        'Referer': 'https://www.mercadolivre.com.br/',
      }
    });
 
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: `ML returned ${r.status}`, body: text.substring(0, 200) });
    }
 
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
 
