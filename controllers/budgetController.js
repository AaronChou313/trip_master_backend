const db = require('../config/db');
const { toMySqlDateTime } = require('../utils/datetime');

async function listBudgets(req, res) {
  try {
    const result = await db.query(
      `SELECT id, name, description, amount, actual_amount AS "actualAmount", category, user_id,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM budgets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('List budgets error:', error);
    return res.status(500).json({ error: 'Failed to fetch budgets' });
  }
}

async function createBudget(req, res) {
  try {
    const { id, name, description, amount, actualAmount, category } = req.body;
    const now = toMySqlDateTime();
    const result = await db.query(
      `INSERT INTO budgets (id, name, description, amount, actual_amount, category, user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, description, amount, actual_amount AS "actualAmount", category, user_id,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id || Date.now().toString(), name, description, amount, actualAmount || 0, category, req.user.userId, now, now]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create budget error:', error);
    return res.status(500).json({ error: 'Failed to create budget' });
  }
}

async function updateBudget(req, res) {
  try {
    const { name, description, amount, actualAmount, category } = req.body;
    const result = await db.query(
      `UPDATE budgets
       SET name = $1, description = $2, amount = $3, actual_amount = $4, category = $5, updated_at = $6
       WHERE id = $7 AND user_id = $8
       RETURNING id, name, description, amount, actual_amount AS "actualAmount", category, user_id,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        name,
        description,
        amount,
        actualAmount !== undefined ? actualAmount : null,
        category,
        toMySqlDateTime(),
        req.params.id,
        req.user.userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Update budget error:', error);
    return res.status(500).json({ error: 'Failed to update budget' });
  }
}

async function deleteBudget(req, res) {
  try {
    const result = await db.query(
      'DELETE FROM budgets WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    return res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Delete budget error:', error);
    return res.status(500).json({ error: 'Failed to delete budget' });
  }
}

module.exports = {
  listBudgets,
  createBudget,
  updateBudget,
  deleteBudget
};
