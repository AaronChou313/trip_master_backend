const db = require('../config/db');
const { toMySqlDateTime } = require('../utils/datetime');

async function listMemos(req, res) {
  try {
    const result = await db.query(
      'SELECT * FROM memos WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('List memos error:', error);
    return res.status(500).json({ error: 'Failed to fetch memos' });
  }
}

async function createMemo(req, res) {
  try {
    const { id, title, content } = req.body;
    const now = toMySqlDateTime();
    const result = await db.query(
      `INSERT INTO memos (id, title, content, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id || Date.now().toString(), title || 'New Memo', content || '', req.user.userId, now, now]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create memo error:', error);
    return res.status(500).json({ error: 'Failed to create memo' });
  }
}

async function updateMemo(req, res) {
  try {
    const { title, content } = req.body;
    const result = await db.query(
      `UPDATE memos
       SET title = $1, content = $2, updated_at = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [title, content, toMySqlDateTime(), req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Memo not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Update memo error:', error);
    return res.status(500).json({ error: 'Failed to update memo' });
  }
}

async function deleteMemo(req, res) {
  try {
    const result = await db.query(
      'DELETE FROM memos WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Memo not found' });
    }

    return res.json({ message: 'Memo deleted successfully' });
  } catch (error) {
    console.error('Delete memo error:', error);
    return res.status(500).json({ error: 'Failed to delete memo' });
  }
}

module.exports = {
  listMemos,
  createMemo,
  updateMemo,
  deleteMemo
};
