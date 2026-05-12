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

  if (!q) {
    return new Response(JSON.stringify({ error: 'q is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Primeiro faz uma introspection para descobrir os campos disponíveis
  const introspectionQuery = `
    {
      __schema {
        queryType {
          fields {
            name
            args { name }
          }
        }
      }
    }
  `;

  try {
    const credentials = toBase64(`${CULTS_USER}:${CULTS_API_KEY}`);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json'
    };

    // Tenta introspection para ver queries disponíveis
    const introR = await fetch('https://cults3d.com/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: introspectionQuery })
    });

    const introData = await introR.json();
    const queryFields = introData?.data?.__schema?.queryType?.fields?.map(f => f.name) || [];

    // Tenta diferentes nomes de query que o Cults pode usar
    const queries = [
      { name: 'searchCreations', q: `query { searchCreations(q: "${q}", limit: 10) { name slug price free downloadsCount illustrationImageUrl publishedAt } }` },
      { name: 'creations',       q: `query { creations(q: "${q}", limit: 10) { name slug price free downloadsCount illustrationImageUrl publishedAt } }` },
      { name: 'search',          q: `query { search(q: "${q}") { creations { name slug price free downloadsCount illustrationImageUrl publishedAt } } }` },
    ];

    let items = [];
    let usedQuery = '';

    for (const attempt of queries) {
      if (queryFields.length > 0 && !queryFields.includes(attempt.name) && attempt.name !== 'search') continue;
      const r = await fetch('https://cults3d.com/graphql', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: attempt.q })
      });
      const d = await r.json();
      if (d.errors) continue;
      const data = d?.data;
      items = data?.[attempt.name] || data?.[attempt.name]?.creations || [];
      if (items.length > 0) { usedQuery = attempt.name; break; }
    }

    return new Response(JSON.stringify({
      results: items.map(i => ({
        nome:      i.name,
        preco:     i.price > 0 ? `$${parseFloat(i.price).toFixed(2)}` : 'Grátis',
        downloads: i.downloadsCount || 0,
        data:      i.publishedAt ? i.publishedAt.substring(0, 10) : '',
        imagem:    i.illustrationImageUrl || '',
        link:      `https://cults3d.com/en/3d-model/${i.slug}`,
        free:      i.free
      })),
      _debug: { queryFields, usedQuery }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
