export const config = { runtime: 'edge' };

const EHUNT_TOKEN = 'vip_c9c806a535ee14225efcb2816093f9d523175c0ecc4748ea';

// sort_by: 1=listed_time, 2=reviews, 3=favorites, 4=sales_total, 5=price, 6=sales_weekly
export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const sortBy = parseInt(searchParams.get('sort_by') || '4'); // 4=total sales

  if (!q) return new Response(JSON.stringify({ results: [], allTags: [] }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

  try {
    const body = {
      search_key: q,
      status: 1,
      sort_by: sortBy,
      desc: 1,
      page_num: 1,
      page_size: limit,
    };

    const r = await fetch('https://api.ehunt.ai/api/v1/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VIP-TOKEN': EHUNT_TOKEN,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000)
    });

    const text = await r.text();
    let d;
    try { d = JSON.parse(text); } catch(e) {
      return new Response(JSON.stringify({ results: [], error: 'parse error', raw: text.substring(0,200) }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (d.code !== 0) {
      return new Response(JSON.stringify({ results: [], error: d.msg || d.message, code: d.code }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const items = d.data?.list || [];

    const results = items.map(item => ({
      nome:      item.title || '',
      vendas:    item.sales_total || 0,
      vendas_semana: item.sales_weekly || 0,
      favoritos: item.favorites || 0,
      reviews:   item.reviews || 0,
      preco:     item.price ? `$${parseFloat(item.price).toFixed(2)}` : '—',
      imagem:    item.logo_url || '',
      link:      item.product_url || '',
      loja:      item.store_name || '',
      categoria: item.category || '',
      bestsell:  item.is_bestsell === 1,
      tags:      item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }));

    const allTags = [...new Set(results.flatMap(r => r.tags))].slice(0, 30);

    return new Response(JSON.stringify({
      results,
      allTags,
      total: d.data?.product_num || results.length,
      credits_remaining: d.remaining_today
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=120' }
    });

  } catch(e) {
    return new Response(JSON.stringify({ results: [], error: e.message }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
