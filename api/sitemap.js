const PROJECT = 'lifedecoart-cms';
const BASE = 'https://lifedecoart.com';

function decode(value) {
  if (!value || typeof value !== 'object') return value;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(decode);
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decode(item)]));
  return value;
}

async function content(id) {
  try {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/content/${id}`);
    if (!response.ok) return {};
    const json = await response.json();
    return Object.fromEntries(Object.entries(json.fields || {}).map(([key, value]) => [key, decode(value)]));
  } catch (_) { return {}; }
}

module.exports = async function handler(req, res) {
  const [tienda, aprende] = await Promise.all([content('tienda'), content('aprende')]);
  const urls = new Set(['/', '/sobre-mi', '/tienda', '/aprende', '/blog', '/encargo-personalizado', '/contacto', '/politica-de-privacidad', '/terminos-y-condiciones', '/servicios/rotulacion', '/servicios/personalizados', '/servicios/packaging', '/servicios/souvenirs']);
  (tienda.products || []).filter(item => item && item.id && item.status !== 'Borrador').forEach(item => urls.add(`/tienda/producto?id=${encodeURIComponent(item.id)}`));
  [['cursos','curso'],['talleres','taller'],['gratis','recurso']].forEach(([list, route]) => (aprende[list] || []).filter(item => item && item.id && item.status !== 'Borrador').forEach(item => urls.add(`/aprende/${route}?id=${encodeURIComponent(item.id)}`)));
  (aprende.blog || []).filter(item => item && item.id && item.status !== 'Borrador').forEach(item => urls.add(`/blog?id=${encodeURIComponent(item.id)}`));
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map(path => `  <url><loc>${BASE}${path.replace(/&/g, '&amp;')}</loc></url>`).join('\n')}\n</urlset>`;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
};
