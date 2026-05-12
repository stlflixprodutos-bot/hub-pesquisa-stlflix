export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) return new Response(JSON.stringify({ results: [] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

  try {
    // API pública do ML — não precisa de autenticação para busca
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(q)}&limit=25&sort=sold_quantity_desc`;
    const r = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      }
    });

    const text = await r.text();

    if (!r.ok) {
      return new Response(JSON.stringify({ results: [], _err: `${r.status}: ${text.substring(0,200)}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60'
      }
    });
  } catch(e) {
    return new Response(JSON.stringify({ results: [], _err: e.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
