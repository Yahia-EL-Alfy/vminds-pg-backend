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

    await sendVerificationEmail(email, verificationCode);

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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const client = await pool.connect();

  try {
    const userQuery = `
      SELECT id, first_name, last_name, username, email, password_hash 
      FROM users 
      WHERE email = $1
    `;
    const userResult = await client.query(userQuery, [email]);

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


module.exports = { 
  signUp,
  signIn,
  signUpThirdParty
};
