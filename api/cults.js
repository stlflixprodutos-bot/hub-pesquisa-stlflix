export const config = { runtime: 'edge' };

const CULTS_API_KEY = 'qPeH1vdRg2tNjgithJ6VihjlP';
const CULTS_USER = 'stlflixprodutos';

// Edge Runtime não tem btoa — codifica Base64 manualmente
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

  const query = `
    query SearchCreations($q: String!) {
      searchCreations(q: $q, limit: 20) {
        name
        slug
        price
        free
        downloadsCount
        publishedAt
        illustrationImageUrl
        creator { nick }
      }
    }
  `;

  try {
    const credentials = toBase64(`${CULTS_USER}:${CULTS_API_KEY}`);
    const r = await fetch('https://cults3d.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query, variables: { q } })
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ error: `Cults ${r.status}`, results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const data = await r.json();
    let items = data?.data?.searchCreations || [];
    if (onlyPaid) items = items.filter(i => !i.free && i.price > 0);

    const results = items.map(i => ({
      nome:      i.name,
      preco:     i.price > 0 ? `$${i.price.toFixed(2)}` : 'Grátis',
      downloads: i.downloadsCount || 0,
      data:      i.publishedAt ? i.publishedAt.substring(0, 10) : '',
      imagem:    i.illustrationImageUrl || '',
      link:      `https://cults3d.com/en/3d-model/${i.slug}`,
      free:      i.free
    }));

    return new Response(JSON.stringify({ results }), {
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
