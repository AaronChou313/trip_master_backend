const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { toMySqlDateTime } = require('../utils/datetime');

const JWT_SECRET = process.env.JWT_SECRET || 'tripmaster_jwt_secret_key_2026';

function buildToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at
      },
      token: buildToken(user)
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await db.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $2',
      [username, username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    return res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token: buildToken(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCurrentUser(req, res) {
  try {
    const result = await db.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateCurrentUser(req, res) {
  try {
    const { username, email, currentPassword, newPassword } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters' });
      }
    }

    const currentUser = await db.query(
      'SELECT id, username, email, password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (currentUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = currentUser.rows[0];
    if (newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    const existingUser = await db.query(
      'SELECT id, username, email FROM users WHERE (username = $1 OR email = $2) AND id != $3',
      [username, email, req.user.userId]
    );

    if (existingUser.rows.length > 0) {
      const conflictUser = existingUser.rows[0];
      if (conflictUser.username === username) {
        return res.status(409).json({ error: 'Username is already taken' });
      }
      return res.status(409).json({ error: 'Email is already taken' });
    }

    let updateFields = 'username = $1, email = $2';
    const updateValues = [username, email];
    let paramIndex = 3;

    if (newPassword) {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      updateFields += `, password_hash = $${paramIndex}`;
      updateValues.push(passwordHash);
      paramIndex += 1;
    }

    updateValues.push(toMySqlDateTime(), req.user.userId);
    const result = await db.query(
      `UPDATE users
       SET ${updateFields}, updated_at = $${paramIndex}
       WHERE id = $${paramIndex + 1}
       RETURNING id, username, email, created_at, updated_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];
    return res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at
      },
      token: buildToken(updatedUser)
    });
  } catch (error) {
    console.error('Update current user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteCurrentUser(req, res) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const currentUser = await db.query(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (currentUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(password, currentUser.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Password is incorrect' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [req.user.userId]);
    return res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete current user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  register,
  login,
  getCurrentUser,
  updateCurrentUser,
  deleteCurrentUser
};
