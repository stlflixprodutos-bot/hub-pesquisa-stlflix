export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || 'organizer';

  // busca campos que contenham "print" ou "model" no schema
  const introspect = `{
    __schema {
      queryType {
        fields {
          name
          args { name type { name kind ofType { name kind } } }
        }
      }
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

    const d = await r.json();
    // filtra apenas campos com "print" ou "model" ou "search" no nome
    const fields = d?.data?.__schema?.queryType?.fields || [];
    const relevant = fields.filter(function(f) {
      return /print|model|search|popular|trend/i.test(f.name);
    });

    return new Response(JSON.stringify({ relevant, total_fields: fields.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
