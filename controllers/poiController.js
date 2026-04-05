const db = require('../config/db');
const { toMySqlDateTime } = require('../utils/datetime');

async function listPois(req, res) {
  try {
    const result = await db.query(
      'SELECT * FROM pois WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('List POIs error:', error);
    return res.status(500).json({ error: 'Failed to fetch POIs' });
  }
}

async function createPoi(req, res) {
  try {
    const { id, name, address, location, tel, type, typecode } = req.body;
    const result = await db.query(
      `INSERT INTO pois (id, name, address, location, tel, type, typecode, user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id || Date.now().toString(),
        name,
        address,
        location,
        tel,
        type,
        typecode,
        req.user.userId,
        toMySqlDateTime()
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create POI error:', error);
    return res.status(500).json({ error: 'Failed to create POI' });
  }
}

async function deletePoi(req, res) {
  try {
    const result = await db.query(
      'DELETE FROM pois WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'POI not found' });
    }

    return res.json({ message: 'POI deleted successfully' });
  } catch (error) {
    console.error('Delete POI error:', error);
    return res.status(500).json({ error: 'Failed to delete POI' });
  }
}

module.exports = {
  listPois,
  createPoi,
  deletePoi
};
