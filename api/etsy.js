export const config = { runtime: 'edge' };

// Etsy API v3 — chave pública para leitura
// Para usar: criar app em https://www.etsy.com/developers/register
// e pegar o API Key (keystring) — sem OAuth para leitura pública
const ETSY_KEY = 'xlbvuxg93ifvy8txae49xq73';

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '25');

  if (!q) return new Response(JSON.stringify({ results: [] }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

  // Sem chave configurada — retorna instruções
  if (ETSY_KEY === 'ETSY_KEY_PLACEHOLDER') {
    return new Response(JSON.stringify({
      results: [],
      _info: 'Configure ETSY_KEY no arquivo api/etsy.js. Cadastre em https://www.etsy.com/developers/register'
    }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const url = `https://openapi.etsy.com/v3/application/listings/active?keywords=${encodeURIComponent(q)}&limit=${limit}&sort_on=score&sort_order=desc&includes=Images,MainImage`;
    const r = await fetch(url, {
      headers: {
        'x-api-key': ETSY_KEY,
        'Accept': 'application/json'
      }
    });
    if (!r.ok) throw new Error(`Etsy ${r.status}`);
    const d = await r.json();

    const results = (d.results || []).map(item => ({
      nome:      item.title,
      reviews:   item.num_favorers || 0,
      preco:     item.price ? `$${(item.price.amount / item.price.divisor).toFixed(2)}` : '—',
      imagem:    item.MainImage?.url_570xN || item.MainImage?.url_170x135 || '',
      link:      item.url,
      tags:      item.tags || [],
      categorias: item.taxonomy_path || [],
      loja:      item.shop_id || ''
    }));

    // extrai todas as tags únicas para nuvem de palavras
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
