export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const sub = searchParams.get('sub') || '3Dprinting';
  const period = searchParams.get('t') || 'month';
  const limit = searchParams.get('limit') || '25';

  try {
    const url = `https://www.reddit.com/r/${sub}/top.json?limit=${limit}&t=${period}`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'STLFlix-Hub/1.0',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });
 
    if (!r.ok) throw new Error(`Reddit ${r.status}`);
    const data = await r.json();

    const posts = (data?.data?.children || []).map(p => ({
      title:    p.data.title,
      score:    p.data.score,
      comments: p.data.num_comments,
      url:      'https://reddit.com' + p.data.permalink,
      flair:    p.data.link_flair_text || '',
      sub:      sub,
      text:     (p.data.selftext || '').substring(0, 200),
    }));

    return new Response(JSON.stringify({ posts, sub, total: posts.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300'
      }
    });
  } catch(e) {
    return new Response(JSON.stringify({ posts: [], error: e.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
