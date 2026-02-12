/**
 * Vercel Serverless Function - Reverse Geocoding Proxy
 * 
 * Proxies requests to Nominatim OpenStreetMap reverse geocoding API
 * to avoid CORS issues in the browser.
 * 
 * Usage: GET /api/geocode?lat=<latitude>&lon=<longitude>
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lon } = req.query;

  // Validate parameters
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing lat or lon parameters' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ error: 'Invalid lat or lon values' });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'lat/lon out of range' });
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'UmmahConfederation/1.0 (prayer-times-widget)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const data = await response.json();

    // Extract relevant fields
    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.county ||
      'Unknown';
    const country = data.address?.country || 'Unknown';

    // Set cache headers (geocoding results rarely change)
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800'); // 7 days
    res.setHeader('Access-Control-Allow-Origin', '*');

    return res.status(200).json({ city, country });

  } catch (error) {
    console.error('Geocoding error:', error);
    return res.status(502).json({ error: 'Geocoding service unavailable' });
  }
}
