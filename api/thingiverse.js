export const config = { runtime: 'edge' };

const APP_TOKEN = '398e87573fcba496bd95b603bf583612';

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || 'organizer';
  const sort = searchParams.get('sort') || 'popular';
  const per_page = parseInt(searchParams.get('per_page') || '20');
 
  try {
    const url = `https://api.thingiverse.com/search/${encodeURIComponent(q)}?sort=${sort}&per_page=${per_page}&type=things`;
    const r = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${APP_TOKEN}`,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!r.ok) {
      const text = await r.text();
      return new Response(JSON.stringify({ results: [], error: `TV ${r.status}`, detail: text.substring(0, 200) }), {
        status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const data = await r.json();
    const hits = Array.isArray(data) ? data : (data.hits || data.results || []);

    const results = hits.slice(0, 20).map(t => ({
      nome:      t.name,
      autor:     t.creator?.name || '',
      downloads: t.download_count || 0,
      likes:     t.like_count || 0,
      views:     t.view_count || 0,
      data:      t.added ? t.added.substring(0, 10) : '',
      imagem:    t.thumbnail || t.preview_image || '',
      link:      `https://www.thingiverse.com/thing:${t.id}`,
      tags:      (t.tags || []).map(tg => tg.name || tg).slice(0, 8),
    }));

    return new Response(JSON.stringify({ results, total: hits.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=300' }
    });
  } catch(e) {
    return new Response(JSON.stringify({ results: [], error: e.message }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
