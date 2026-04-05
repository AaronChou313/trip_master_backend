const db = require('../config/db');
const itineraryService = require('../services/itineraryService');
const { toMySqlDateTime, toMySqlDate } = require('../utils/datetime');

async function listItineraries(req, res) {
  try {
    const itineraries = await itineraryService.getUserItineraries(req.user.userId);
    return res.json(itineraries);
  } catch (error) {
    console.error('List itineraries error:', error);
    return res.status(500).json({ error: 'Failed to fetch itineraries' });
  }
}

async function createItinerary(req, res) {
  try {
    const { id, name, date, description, pois } = req.body;
    const now = toMySqlDateTime();
    const itineraryId = id || Date.now().toString();

    await db.query(
      `INSERT INTO itineraries (id, name, date, description, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [itineraryId, name, toMySqlDate(date), description, req.user.userId, now, now]
    );

    await itineraryService.replaceItineraryPois(itineraryId, req.user.userId, pois);
    const itinerary = await itineraryService.getUserItineraryById(itineraryId, req.user.userId);
    return res.status(201).json(itinerary);
  } catch (error) {
    console.error('Create itinerary error:', error);
    return res.status(500).json({ error: 'Failed to create itinerary' });
  }
}

async function updateItinerary(req, res) {
  try {
    const { name, date, description, pois } = req.body;
    const result = await db.query(
      `UPDATE itineraries
       SET name = $1, date = $2, description = $3, updated_at = $4
       WHERE id = $5 AND user_id = $6
       RETURNING id`,
      [name, toMySqlDate(date), description, toMySqlDateTime(), req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    await itineraryService.replaceItineraryPois(req.params.id, req.user.userId, pois);
    const itinerary = await itineraryService.getUserItineraryById(req.params.id, req.user.userId);
    return res.json(itinerary);
  } catch (error) {
    console.error('Update itinerary error:', error);
    return res.status(500).json({ error: 'Failed to update itinerary' });
  }
}

async function deleteItinerary(req, res) {
  try {
    const result = await db.query(
      'DELETE FROM itineraries WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }

    return res.json({ message: 'Itinerary deleted successfully' });
  } catch (error) {
    console.error('Delete itinerary error:', error);
    return res.status(500).json({ error: 'Failed to delete itinerary' });
  }
}

module.exports = {
  listItineraries,
  createItinerary,
  updateItinerary,
  deleteItinerary
};
