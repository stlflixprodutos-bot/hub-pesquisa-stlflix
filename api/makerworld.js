export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || 'organizer';
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    // Endpoint de busca público do MakerWorld
    const url = `https://makerworld.com/api/v1/search/list?keyword=${encodeURIComponent(q)}&limit=${limit}&offset=0&sort=popularity`;
    
    const r = await fetch(url, { 
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; research/1.0)',
        'Referer': 'https://makerworld.com',
      },
      signal: AbortSignal.timeout(8000)
    });

    const text = await r.text();
    
    return new Response(JSON.stringify({
      _status: r.status,
      _url: url,
      _raw: text.substring(0, 3000)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
