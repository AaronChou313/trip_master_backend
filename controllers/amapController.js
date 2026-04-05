async function searchPlace(req, res) {
  try {
    const { keywords, city } = req.query;
    const apiKey = process.env.AMAP_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'AMAP API key not configured' });
    }

    const url = `${process.env.AMAP_API_URL}/place/text?key=${apiKey}&keywords=${encodeURIComponent(keywords)}&city=${encodeURIComponent(city || '')}&offset=20&page=1&extensions=all`;
    const response = await fetch(url);
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('AMAP API error:', error);
    return res.status(500).json({ error: 'Failed to fetch from AMAP API' });
  }
}

module.exports = {
  searchPlace
};
