export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ indices: [] }), {
      status: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const { stlSample, cultsSample, cultsCount } = await req.json();

    // Análise semântica local — agrupa por conceito sem precisar de API externa
    // Extrai conceitos-chave de cada produto Cults
    const stlWords = new Set(
      stlSample.toLowerCase()
        .split(/[,\s\-&]+/)
        .filter(w => w.length > 3)
    );

    const cultsProducts = cultsSample.split(',').map(s => s.trim());

    const gapIndices = [];
    cultsProducts.forEach((nome, i) => {
      const words = nome.toLowerCase().split(/[\s\-_]+/).filter(w => w.length > 3);
      // considera gap se nenhuma palavra significativa do produto Cults existe no catálogo STLFlix
      const hasMatch = words.some(w => stlWords.has(w));
      if (!hasMatch) gapIndices.push(i);
    });

    return new Response(JSON.stringify({ indices: gapIndices }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch(e) {
    return new Response(JSON.stringify({ indices: [], error: e.message }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
