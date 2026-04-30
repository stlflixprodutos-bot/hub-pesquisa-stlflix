export const config = { runtime: 'edge' };

export default async function handler(req) {
  const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZglpk8yO0E7kZvSNCXB33rSAIUJkGIAKc41D9GdeNWNJYwWg9aTSrwsw4I7lTQPmOHCbwJzD6d1-X/pub?output=csv';

  try {
    const r = await fetch(SHEETS_URL);
    const text = await r.text();

    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
