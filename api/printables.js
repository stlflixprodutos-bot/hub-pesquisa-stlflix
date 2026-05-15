export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || 'organizer';
  const limit = parseInt(searchParams.get('limit') || '20');

  // primeiro faz introspection para descobrir o schema real
  const introspect = `{
    __schema {
      queryType { fields { name args { name type { name kind } } } }
    }
  }`;

  try {
    const r = await fetch('https://api.printables.com/graphql/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://www.printables.com',
        'Referer': 'https://www.printables.com',
      },
      body: JSON.stringify({ query: introspect }),
      signal: AbortSignal.timeout(10000)
    });

    const text = await r.text();
    return new Response(JSON.stringify({ _status: r.status, _raw: text.substring(0, 4000) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
