export const config = { runtime: 'edge' };

const EHUNT_TOKEN = 'vip_c9c806a535ee14225efcb2816093f9d523175c0ecc4748ea';

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '20');
  const sort = searchParams.get('sort') || 'sales';

  if (!q) return new Response(JSON.stringify({ results: [], _info: 'no query' }), {
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

    const text = await r.text();

    // retorna raw para debug — ver estrutura real
    return new Response(JSON.stringify({
      _status: r.status,
      _raw: text.substring(0, 2000)
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
