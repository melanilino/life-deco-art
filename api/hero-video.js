const PROJECT = 'lifedecoart-cms';

module.exports = async function handler(req, res) {
  try {
    const endpoint = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/content/inicio`;
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Firestore respondió ${response.status}`);
    const document = await response.json();
    const videoUrl = document?.fields?.heroVideoUrl?.stringValue;
    if (!videoUrl) {
      res.statusCode = 404;
      res.end('Video no disponible');
      return;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=30');
    res.setHeader('Location', videoUrl);
    res.statusCode = 302;
    res.end();
  } catch (error) {
    res.statusCode = 503;
    res.end('Video temporalmente no disponible');
  }
};
