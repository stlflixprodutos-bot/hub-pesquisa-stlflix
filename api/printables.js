export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || 'organizer';
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    const query = `{
      prints(limit: ${limit}, offset: 0, ordering: "-likes_count", search: ${JSON.stringify(q)}) {
        hits {
          id
          name
          slug
          likesCount
          downloadCount
          commentsCount
          category { name }
          images { filePath }
          url
          user { publicUsername }
          datePublished
          tags { name }
        }
        totalCount
      }
    }`;

    const r = await fetch('https://api.printables.com/graphql/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://www.printables.com',
        'Referer': 'https://www.printables.com',
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000)
    });

    const text = await r.text();

    return new Response(JSON.stringify({
      _status: r.status,
      _raw: text.substring(0, 3000)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
