export const config = { runtime: 'edge' };

const CULTS_API_KEY = 'qPeH1vdRg2tNjgithJ6VihjlP';
const CULTS_USER = 'stlflixprodutos';

function toBase64(str) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  const bytes = new TextEncoder().encode(str);
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i+1] ?? 0, b2 = bytes[i+2] ?? 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i+1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i+2 < bytes.length ? chars[b2 & 63] : '=';
  }
  return result;
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const debug = searchParams.get('debug') === '1';

  if (!q) return new Response(JSON.stringify({ results: [] }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });

  const credentials = toBase64(`${CULTS_USER}:${CULTS_API_KEY}`);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${credentials}`,
    'Accept': 'application/json'
  };

  // descobre campos reais de Creation e Money
  if (debug) {
    const q1 = `{ __type(name:"Creation"){ fields{ name } } }`;
    const q2 = `{ __type(name:"Money"){ fields{ name } } }`;
    const [r1, r2] = await Promise.all([
      fetch('https://cults3d.com/graphql', { method:'POST', headers, body: JSON.stringify({query:q1}) }).then(r=>r.json()),
      fetch('https://cults3d.com/graphql', { method:'POST', headers, body: JSON.stringify({query:q2}) }).then(r=>r.json()),
    ]);
    return new Response(JSON.stringify({
      creationFields: r1?.data?.__type?.fields?.map(f=>f.name),
      moneyFields: r2?.data?.__type?.fields?.map(f=>f.name),
    }), { status:200, headers: { 'Content-Type':'application/json','Access-Control-Allow-Origin':'*' } });
  }

  const gql = `query {
    creationsSearchBatch(
      query: ${JSON.stringify(q)},
      limit: 20,
      onlyPriced: true
    ) {
      total
      results {
        name
        slug
        url
        illustrationImageUrl
        downloadsCount
        likesCount
        publishedAt
        price { cents currency formatted }
      }
    }
  }`;

  try {
    const r = await fetch('https://cults3d.com/graphql', {
      method: 'POST', headers, body: JSON.stringify({ query: gql })
    });
    const d = await r.json();

    if (d.errors) {
      return new Response(JSON.stringify({ results: [], _debug: { errors: d.errors } }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const items = d?.data?.creationsSearchBatch?.results || [];
    return new Response(JSON.stringify({
      total: d?.data?.creationsSearchBatch?.total || 0,
      results: items.map(i => ({
        nome:      i.name || i.slug,
        preco:     i.price?.formatted || (i.price?.cents > 0 ? `$${(i.price.cents/100).toFixed(2)}` : 'Grátis'),
        downloads: i.downloadsCount || 0,
        likes:     i.likesCount || 0,
        data:      i.publishedAt ? i.publishedAt.substring(0,10) : '',
        imagem:    i.illustrationImageUrl || '',
        link:      i.url || `https://cults3d.com/en/3d-model/${i.slug}`,
      }))
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
