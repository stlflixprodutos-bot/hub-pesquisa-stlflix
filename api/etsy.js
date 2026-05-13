export const config = { runtime: 'edge' };

const EHUNT_TOKEN = 'vip_c9c806a535ee14225efcb2816093f9d523175c0ecc4748ea';

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20');
  const sort = searchParams.get('sort') || 'sales'; // sales, favorites, reviews, price

  if (!q) return new Response(JSON.stringify({ results: [] }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

  try {
    const body = {
      keyword: q,
      page: 1,
      page_size: limit,
      sort_by: sort,
      sort_order: 'desc',
    };

    const r = await fetch('https://api.ehunt.ai/api/v1/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VIP-TOKEN': EHUNT_TOKEN,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });

    if (!r.ok) {
      const text = await r.text();
      return new Response(JSON.stringify({ results: [], _debug: { status: r.status, body: text.substring(0, 300) } }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const d = await r.json();
    const items = d.data?.items || d.items || d.data || [];

    const results = items.map(item => ({
      nome:      item.title || item.listing_title || '',
      vendas:    item.sales_count || item.total_sales || item.sales || 0,
      favoritos: item.favorites_count || item.num_favorers || item.favorites || 0,
      reviews:   item.reviews_count || item.num_reviews || item.reviews || 0,
      preco:     item.price ? `$${parseFloat(item.price).toFixed(2)}` : (item.price_usd ? `$${parseFloat(item.price_usd).toFixed(2)}` : '—'),
      imagem:    item.image || item.main_image || item.thumbnail || '',
      link:      item.url || item.listing_url || (item.listing_id ? `https://www.etsy.com/listing/${item.listing_id}` : ''),
      loja:      item.shop_name || item.store_name || '',
      tags:      item.tags || [],
    }));

    // extrai tags únicas para nuvem de palavras
    const allTags = [...new Set(results.flatMap(r => Array.isArray(r.tags) ? r.tags : []))].slice(0, 30);

    return new Response(JSON.stringify({ results, allTags, total: d.data?.total || results.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=120' }
    });
  } catch(e) {
    return new Response(JSON.stringify({ results: [], error: e.message }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
