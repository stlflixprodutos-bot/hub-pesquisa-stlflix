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

  // Primeiro descobre os campos do tipo CreationBatch
  const fieldsQuery = `{
    __type(name: "CreationBatch") {
      fields { name }
    }
  }`;

  try {
    const credentials = toBase64(`${CULTS_USER}:${CULTS_API_KEY}`);
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${credentials}`,
      'Accept': 'application/json'
    };

    // descobre campos do CreationBatch
    const fieldsR = await fetch('https://cults3d.com/graphql', {
      method: 'POST', headers,
      body: JSON.stringify({ query: fieldsQuery })
    });
    const fieldsData = await fieldsR.json();
    const availableFields = fieldsData?.data?.__type?.fields?.map(f => f.name) || [];

    // campos que queremos, filtrados pelo que existe
    const wantedFields = ['name','slug','price','free','downloadsCount','illustrationImageUrl','publishedAt','likesCount'];
    const fields = wantedFields.filter(f => availableFields.includes(f));
    const fieldsStr = fields.length > 0 ? fields.join('\n            ') : 'name slug price free downloadsCount illustrationImageUrl publishedAt';

    const gql = `query {
      creationsSearchBatch(
        query: ${JSON.stringify(q)},
        limit: 20,
        onlyPriced: ${onlyPaid},
        sort: DOWNLOADS,
        direction: DESC
      ) {
        ${fieldsStr}
      }
    }`;

    const r = await fetch('https://cults3d.com/graphql', {
      method: 'POST', headers,
      body: JSON.stringify({ query: gql })
    });
    const d = await r.json();

    if (d.errors) {
      return new Response(JSON.stringify({ results: [], _debug: { errors: d.errors, availableFields, gql } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const items = d?.data?.creationsSearchBatch || [];

    return new Response(JSON.stringify({
      results: items.map(i => ({
        nome:      i.name || i.slug || '—',
        preco:     parseFloat(i.price||0) > 0 ? `$${parseFloat(i.price).toFixed(2)}` : 'Grátis',
        downloads: i.downloadsCount || 0,
        data:      i.publishedAt ? i.publishedAt.substring(0, 10) : '',
        imagem:    i.illustrationImageUrl || '',
        link:      `https://cults3d.com/en/3d-model/${i.slug}`,
        free:      i.free
      }))
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=120'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
