export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const SHEETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTZglpk8yO0E7kZvSNCXB33rSAIUJkGIAKc41D9GdeNWNJYwWg9aTSrwsw4I7lTQPmOHCbwJzD6d1-X/pub?output=csv';

  try {
    const r = await fetch(SHEETS_URL);
    const text = await r.text();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
