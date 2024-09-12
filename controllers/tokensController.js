const pool = require('../config/database');

const addTokenToUser = async (req, res) => {
  const userId = req.userId;
  const { tokens } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  if (!tokens || tokens <= 0) {
    return res.status(400).json({ error: 'A valid token count is required.' });
  }

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        'SELECT available_tokens FROM users WHERE id = $1',
        [userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }

      const currentTokens = rows[0].available_tokens || 0;
      const newTokenCount = currentTokens + tokens;

      await client.query(
        'UPDATE users SET available_tokens = $1 WHERE id = $2',
        [newTokenCount, userId]
      );

      await client.query('COMMIT');

      return res.status(200).json({
        message: `Tokens added successfully. New available token count: ${newTokenCount}`,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      res.status(500).json({ error: 'Server error' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const addTokenToUserfunc = async (userId, tokens) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  if (!tokens || tokens <= 0) {
    throw new Error('A valid token count is required.');
  }

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        'SELECT available_tokens FROM users WHERE id = $1',
        [userId]
      );

      if (rows.length === 0) {
        throw new Error('User not found.');
      }

      const currentTokens = rows[0].available_tokens || 0;
      const newTokenCount = currentTokens + tokens;

      await client.query(
        'UPDATE users SET available_tokens = $1 WHERE id = $2',
        [newTokenCount, userId]
      );

      await client.query('COMMIT');

      return {
        message: `Tokens added successfully. New available token count: ${newTokenCount}`,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      throw new Error('Server error');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Server error');
  }
};

module.exports = {
  addTokenToUser,
  addTokenToUserfunc
};
