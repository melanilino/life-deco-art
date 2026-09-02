const PROJECT = 'lifedecoart-cms';

module.exports = async function handler(req, res) {
  try {
    const endpoint = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/content/inicio`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Firestore respondió ${response.status}`);
    const document = await response.json();
    const posterUrl = document?.fields?.heroVideoPosterUrl?.stringValue;
    if (!posterUrl) {
      res.statusCode = 404;
      res.end('Portada no disponible');
      return;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.setHeader('Location', posterUrl);
    res.statusCode = 302;
    res.end();
  } catch (error) {
    res.statusCode = 503;
    res.end('Portada temporalmente no disponible');
  }
};
