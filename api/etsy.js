export const config = { runtime: 'edge' };

const EHUNT_TOKEN = 'vip_c9c806a535ee14225efcb2816093f9d523175c0ecc4748ea';

const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000;

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const sortBy = parseInt(searchParams.get('sort_by') || '4');

  if (!q) {
    return new Response(JSON.stringify({ results: [], allTags: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  const cacheKey = q.toLowerCase().trim() + ':' + sortBy + ':' + limit;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return new Response(JSON.stringify(Object.assign({}, cached.data, { _cached: true })), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const r = await fetch('https://api.ehunt.ai/api/v1/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VIP-TOKEN': EHUNT_TOKEN
      },
      body: JSON.stringify({
        search_key: q,
        sort_by: sortBy,
        desc: 1,
        page_num: 1,
        page_size: limit
      }),
      signal: AbortSignal.timeout(12000)
    });

    const d = await r.json();

    if (d.code !== 0 && d.code !== 200) {
      return new Response(JSON.stringify({ results: [], error: d.msg || d.message, code: d.code }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const items = d.data && d.data.list ? d.data.list : [];

    const results = items.map(function(item) {
      return {
        nome: item.title || '',
        vendas: item.sales_total || 0,
        vendas_semana: item.sales_weekly || 0,
        favoritos: item.favorites || 0,
        reviews: item.reviews || 0,
        preco: item.price ? '$' + parseFloat(item.price).toFixed(2) : '--',
        imagem: item.logo_url || '',
        link: item.product_url || '',
        loja: item.store_name || '',
        bestsell: item.is_bestsell === 1,
        tags: item.tags ? item.tags.split(',').map(function(t) { return t.trim(); }).filter(Boolean) : []
      };
    });

    const allTags = Array.from(new Set(results.reduce(function(acc, r) { return acc.concat(r.tags); }, []))).slice(0, 30);

    const payload = {
      results: results,
      allTags: allTags,
      total: d.data && d.data.product_num ? d.data.product_num : results.length,
      credits_remaining: d.remaining_today
    };

    cache.set(cacheKey, { data: payload, ts: Date.now() });

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=21600'
      }
    });

  } catch(e) {
    return new Response(JSON.stringify({ results: [], error: e.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
