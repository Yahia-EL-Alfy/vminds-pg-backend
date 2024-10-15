const pool = require('../config/database');
const hashPassword = require('../utils/hashPassword');
const { sendVerificationEmail } = require('../utils/mailer');
const { generateVerificationCode } = require('../utils/verificationCode');
const { generateToken } = require('../utils/jwt');
const bcrypt = require('bcrypt');

const signUp = async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body;

  if (!firstName || !lastName || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const client = await pool.connect();

  try {
    const checkUserQuery = `
      SELECT * FROM users 
      WHERE email = $1 OR username = $2;
    `;
    const checkUserResult = await client.query(checkUserQuery, [email, username]);

    if (checkUserResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already exists.' });
    }

    const checkVerificationQuery = `
      SELECT * FROM verification_requests 
      WHERE email = $1;
    `;
    const checkVerificationResult = await client.query(checkVerificationQuery, [email]);

    let verificationCode;
    let expiresAt;

    if (checkVerificationResult.rows.length > 0) {
      verificationCode = generateVerificationCode();
      expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const updateQuery = `
        UPDATE verification_requests 
        SET verification_code = $1, expires_at = $2, created_at = NOW()
        WHERE email = $3;
      `;
      await client.query(updateQuery, [verificationCode, expiresAt, email]);

    } else {
      verificationCode = generateVerificationCode();
      expiresAt = new Date(Date.now() + 10 * 60 * 1000); 

      const hashedPassword = await hashPassword(password);

      const insertQuery = `
        INSERT INTO verification_requests (email, username, first_name, last_name, password_hash, verification_code, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `;
      await client.query(insertQuery, [
        email,
        username,
        firstName,
        lastName,
        hashedPassword,
        verificationCode,
        expiresAt
      ]);
    }

    await sendVerificationEmail(email, verificationCode,firstName);

    res.status(200).json({
      message: 'Verification email sent. Please check your inbox.',
      verificationCode: verificationCode
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user: ' + error.message });
  } finally {
    client.release(); 
  }
};
const signUpThirdParty = async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body;

  if (!firstName || !lastName || !username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const client = await pool.connect();

  try {
    const checkUserQuery = `
      SELECT * FROM users 
      WHERE email = $1 OR username = $2;
    `;
    const checkUserResult = await client.query(checkUserQuery, [email, username]);

    if (checkUserResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email or username already exists.' });
    }

    const hashedPassword = await hashPassword(password);

    const insertUserQuery = `
      INSERT INTO users (email, username, first_name, last_name, password_hash, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW());
    `;
    await client.query(insertUserQuery, [
      email,
      username,
      firstName,
      lastName,
      hashedPassword,
    ]);

    res.status(201).json({ message: 'User created successfully.' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Error creating user: ' + error.message });
  } finally {
    client.release();
  }
};
const signIn = async (req, res) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: 'Email/Username and password are required.' });
  }

  const client = await pool.connect();

  try {
    let userQuery = `
      SELECT id, first_name, last_name, username, email, password_hash 
      FROM users 
      WHERE email = $1 OR username = $2;
    `;
    const userResult = await client.query(userQuery, [emailOrUsername, emailOrUsername]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = userResult.rows[0];
    const isPasswordValid = await bcrypt.compare(password, userData.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    const token = generateToken(userData.id);

    res.status(200).json({
      token,
      firstName: userData.first_name,
      lastName: userData.last_name,
      username: userData.username,
      email: userData.email,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error signing in: ' + error.message });
  } finally {
    client.release();
  }
};

const deleteUsageLogs = async (req, res) => {
  const userId = req.userId; // Assuming userId is extracted from middleware

  if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
  }

  const client = await pool.connect();
  try {
      await client.query('BEGIN');

      // Delete all logs for the specified user
      const result = await client.query(
          'DELETE FROM usage_logs WHERE user_id = $1',
          [userId]
      );

      await client.query('COMMIT');

      return res.json({ message: 'All usage logs deleted successfully.', deletedCount: result.rowCount });

  } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting usage logs:', error);
      return res.status(500).json({ error: 'An error occurred while deleting usage logs.' });
  } finally {
      client.release();
  }
};
const deleteUserAndLogs = async (req, res) => {
  const userId = req.userId; // Assuming userId is extracted from middleware

  if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
  }

  const client = await pool.connect();
  try {
      await client.query('BEGIN');

      // Delete all related entries from other tables
      await client.query('DELETE FROM usage_logs WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_music WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_points WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM token_rewards WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM streak_rewards WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM export_rewards WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM image_rewards WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM used_ai_rewards WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM user_packages WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM transaction_logs WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM refunds WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM reset_password WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM users_cc_tokens WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM tokens_promo WHERE used_by = $1', [userId]);

      // Delete the user from the users table
      const result = await client.query(
          'DELETE FROM users WHERE id = $1 RETURNING *',
          [userId]
      );

      await client.query('COMMIT');

      if (result.rowCount === 0) {
          return res.status(404).json({ error: 'User not found.' });
      }

      return res.json({ message: 'User and all associated logs deleted successfully.' });

  } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting user and logs:', error);
      return res.status(500).json({ error: 'An error occurred while deleting the user.' });
  } finally {
      client.release();
  }
};


module.exports = { 
  signUp,
  signIn,
  signUpThirdParty,
  deleteUsageLogs,
  deleteUserAndLogs
};
