export const config = { runtime: 'edge' };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const sub = searchParams.get('sub') || '3Dprinting';
  const period = searchParams.get('t') || 'month';

  try {
    // Reddit tem feed JSON público via .json — diferente do endpoint /top que bloqueia
    // Usa o feed de posts quentes que é menos restrito
    const urls = [
      `https://www.reddit.com/r/${sub}/top.json?limit=25&t=${period}&raw_json=1`,
      `https://www.reddit.com/r/${sub}/hot.json?limit=25&raw_json=1`,
    ];

    let posts = [];
    for (const url of urls) {
      try {
        const r = await fetch(url, {
          headers: {
            'User-Agent': 'STLFlixHub/1.0 (research tool)',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(8000)
        });
        if (!r.ok) continue;
        const data = await r.json();
        const items = data?.data?.children || [];
        if (items.length > 0) {
          posts = items.map(p => ({
            title:    p.data.title,
            score:    p.data.score,
            comments: p.data.num_comments,
            url:      'https://reddit.com' + p.data.permalink,
            flair:    p.data.link_flair_text || '',
            sub:      sub,
            text:     (p.data.selftext || '').substring(0, 300),
          }));
          break;
        }
      } catch { continue; }
    }

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
