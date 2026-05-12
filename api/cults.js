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
  const onlyPaid = searchParams.get('paid') !== 'false';

  if (!q) {
    return new Response(JSON.stringify({ error: 'q is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  // Primeiro faz uma query de diagnóstico para ver os args de creationsSearchBatch
  const argsQuery = `{
    __schema {
      queryType {
        fields {
          name
          args { name type { name kind ofType { name } } }
        }
      }
    }
  }`;

  try {
    const credentials = toBase64(`${CULTS_USER}:${CULTS_API_KEY}`);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json'
    };

    // Descobre os argumentos do creationsSearchBatch
    const argsR = await fetch('https://cults3d.com/graphql', {
      method: 'POST', headers,
      body: JSON.stringify({ query: argsQuery })
    });
    const argsData = await argsR.json();
    const searchField = argsData?.data?.__schema?.queryType?.fields?.find(f => f.name === 'creationsSearchBatch');
    const argNames = searchField?.args?.map(a => a.name) || [];

    // Monta a query com os args corretos
    // Tenta variações comuns
    const queries = [
      `query { creationsSearchBatch(query: "${q}", page: 1) { name slug price free downloadsCount illustrationImageUrl publishedAt } }`,
      `query { creationsSearchBatch(q: "${q}", page: 1) { name slug price free downloadsCount illustrationImageUrl publishedAt } }`,
      `query { creationsSearchBatch(term: "${q}", page: 1) { name slug price free downloadsCount illustrationImageUrl publishedAt } }`,
      `query { creationsSearchBatch(query: "${q}") { name slug price free downloadsCount illustrationImageUrl publishedAt } }`,
    ];

    let items = [];
    let errors = [];

    for (const gql of queries) {
      const r = await fetch('https://cults3d.com/graphql', {
        method: 'POST', headers,
        body: JSON.stringify({ query: gql })
      });
      const d = await r.json();
      if (d.errors) { errors.push(d.errors[0]?.message); continue; }
      const result = d?.data?.creationsSearchBatch;
      if (result && result.length > 0) { items = result; break; }
    }

    const filtered = onlyPaid ? items.filter(i => !i.free && parseFloat(i.price) > 0) : items;

    return new Response(JSON.stringify({
      results: filtered.map(i => ({
        nome:      i.name,
        preco:     parseFloat(i.price) > 0 ? `$${parseFloat(i.price).toFixed(2)}` : 'Grátis',
        downloads: i.downloadsCount || 0,
        data:      i.publishedAt ? i.publishedAt.substring(0, 10) : '',
        imagem:    i.illustrationImageUrl || '',
        link:      `https://cults3d.com/en/3d-model/${i.slug}`,
        free:      i.free
      })),
      _debug: { argNames, errors }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=120' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
