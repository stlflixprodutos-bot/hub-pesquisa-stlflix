export const config = { runtime: 'edge' };

const ETSY_KEY = 'xlbvuxg93ifvy8txae49xq73';

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '25');

  if (!q) return new Response(JSON.stringify({ results: [] }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

  try {
    // Etsy Open API v3 — endpoint correto
    const url = `https://openapi.etsy.com/v3/application/listings/active?` +
      `keywords=${encodeURIComponent(q)}` +
      `&limit=${limit}` +
      `&sort_on=score` +
      `&sort_order=desc` +
      `&fields=listing_id,title,url,price,num_favorers,tags,taxonomy_path,images`;

    const r = await fetch(url, {
      headers: {
        'x-api-key': ETSY_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    });

    // debug — retorna status e headers para diagnóstico
    if (!r.ok) {
      const text = await r.text();
      return new Response(JSON.stringify({
        results: [],
        _debug: { status: r.status, body: text.substring(0, 300) }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const d = await r.json();
    const results = (d.results || []).map(item => ({
      nome:      item.title,
      reviews:   item.num_favorers || 0,
      preco:     item.price ? `$${(item.price.amount / item.price.divisor).toFixed(2)}` : '—',
      imagem:    item.images?.[0]?.url_570xN || item.images?.[0]?.url_170x135 || '',
      link:      item.url,
      tags:      item.tags || [],
      categorias: item.taxonomy_path || [],
    }));

    const allTags = [...new Set(results.flatMap(r => r.tags))].slice(0, 40);
    const allCats = [...new Set(results.flatMap(r => r.categorias))].slice(0, 20);

    return new Response(JSON.stringify({ results, allTags, allCats, total: d.count || 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=120' }
    });
  } catch(e) {
    return new Response(JSON.stringify({ results: [], error: e.message }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
