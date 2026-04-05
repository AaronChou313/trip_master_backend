const db = require('../config/db');
const { toMySqlDateTime } = require('../utils/datetime');

async function fetchItineraryPoiRows(itineraryIds) {
  if (!Array.isArray(itineraryIds) || itineraryIds.length === 0) {
    return [];
  }

  const placeholders = itineraryIds.map((_, index) => `$${index + 1}`).join(', ');
  const result = await db.query(
    `SELECT
       ip.id,
       ip.itinerary_id,
       ip.poi_id,
       ip.description,
       ip.budget,
       ip.transport_type,
       ip.transport_description,
       ip.transport_budget,
       ip.sort_order,
       p.id AS poi_ref_id,
       p.name AS poi_name,
       p.address AS poi_address,
       p.location AS poi_location,
       p.tel AS poi_tel,
       p.type AS poi_type,
       p.typecode AS poi_typecode
     FROM itinerary_pois ip
     LEFT JOIN pois p ON p.id = ip.poi_id
     WHERE ip.itinerary_id IN (${placeholders})
     ORDER BY ip.itinerary_id, ip.sort_order ASC, ip.created_at ASC`,
    itineraryIds
  );

  return result.rows;
}

function buildPoiItem(row) {
  return {
    id: row.id,
    poi_id: row.poi_id,
    description: row.description,
    budget: row.budget,
    transport_type: row.transport_type,
    transport_description: row.transport_description,
    transport_budget: row.transport_budget,
    sort_order: row.sort_order,
    poi: row.poi_ref_id ? {
      id: row.poi_ref_id,
      name: row.poi_name,
      address: row.poi_address,
      location: row.poi_location,
      tel: row.poi_tel,
      type: row.poi_type,
      typecode: row.poi_typecode
    } : null
  };
}

async function hydrateItineraries(itineraryRows) {
  if (!Array.isArray(itineraryRows) || itineraryRows.length === 0) {
    return [];
  }

  const poiRows = await fetchItineraryPoiRows(itineraryRows.map((row) => row.id));
  const poiMap = new Map();

  for (const row of poiRows) {
    const list = poiMap.get(row.itinerary_id) || [];
    list.push(buildPoiItem(row));
    poiMap.set(row.itinerary_id, list);
  }

  return itineraryRows.map((row) => ({
    ...row,
    pois: poiMap.get(row.id) || []
  }));
}

async function getUserItineraries(userId) {
  const result = await db.query(
    'SELECT * FROM itineraries WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );

  return hydrateItineraries(result.rows);
}

async function getUserItineraryById(itineraryId, userId) {
  const result = await db.query(
    'SELECT * FROM itineraries WHERE id = $1 AND user_id = $2',
    [itineraryId, userId]
  );

  const itineraries = await hydrateItineraries(result.rows);
  return itineraries[0] || null;
}

async function upsertPoiForUser(poi, userId, fallbackCreatedAt) {
  await db.query(
    `INSERT INTO pois (id, name, address, location, tel, type, typecode, user_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       name = VALUES(name),
       address = VALUES(address),
       location = VALUES(location),
       tel = VALUES(tel),
       type = VALUES(type),
       typecode = VALUES(typecode),
       user_id = VALUES(user_id)`,
    [
      poi.id,
      poi.name,
      poi.address || '',
      poi.location || '',
      poi.tel || '',
      poi.type || '',
      poi.typecode || '',
      userId,
      poi.createdAt || fallbackCreatedAt
    ]
  );
}

async function replaceItineraryPois(itineraryId, userId, pois) {
  await db.query('DELETE FROM itinerary_pois WHERE itinerary_id = $1', [itineraryId]);

  if (!Array.isArray(pois) || pois.length === 0) {
    return;
  }

  for (let index = 0; index < pois.length; index += 1) {
    const poi = pois[index];
    const transport = poi.transport || {};
    const createdAt = toMySqlDateTime(poi.createdAt || new Date());

    await upsertPoiForUser(poi, userId, createdAt);
    await db.query(
      `INSERT INTO itinerary_pois (
        itinerary_id, poi_id, description, budget,
        transport_type, transport_description, transport_budget, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        itineraryId,
        poi.id,
        poi.description || null,
        poi.budget || 0,
        transport.type || null,
        transport.description || null,
        transport.budget || 0,
        index
      ]
    );
  }
}

module.exports = {
  getUserItineraries,
  getUserItineraryById,
  replaceItineraryPois
};
