export const config = { runtime: 'edge' };

const CULTS_API_KEY = 'qPeH1vdRg2tNjgithJ6VihjlP';
const CULTS_USER = 'stlflixprodutos';

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
      searchCreations(q: $q, limit: 20, sort: DOWNLOADS) {
        name
        slug
        description
        price
        free
        downloadsCount
        likesCount
        publishedAt
        illustrationImageUrl
        categories { name }
        creator { nick }
        url
      }
    }
  `;

  try {
    const r = await fetch('https://cults3d.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(CULTS_USER + ':' + CULTS_API_KEY)}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query, variables: { q } })
    });

    if (!r.ok) throw new Error(`Cults ${r.status}`);
    const data = await r.json();

    let items = data?.data?.searchCreations || [];

    // filtra apenas pagos se solicitado
    if (onlyPaid) items = items.filter(i => !i.free && i.price > 0);

    const result = items.map(i => ({
      nome:     i.name,
      autor:    i.creator?.nick || '',
      preco:    i.price > 0 ? `$${i.price.toFixed(2)}` : 'Grátis',
      downloads: i.downloadsCount || 0,
      likes:    i.likesCount || 0,
      data:     i.publishedAt ? i.publishedAt.substring(0, 10) : '',
      imagem:   i.illustrationImageUrl || '',
      link:     i.url || `https://cults3d.com/en/3d-model/${i.slug}`,
      free:     i.free
    }));

    return new Response(JSON.stringify({ results: result }), {
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
