const pool = require('../config/database');
const { verifyCode } = require('../utils/verificationCode');

const verifyEmail = async (req, res) => {
  const { email, verificationCode } = req.body;

  if (!email || !verificationCode) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const client = await pool.connect();

  try {
    const verificationQuery = `
      SELECT * FROM verification_requests 
      WHERE email = $1;
    `;
    const verificationResult = await client.query(verificationQuery, [email]);

    if (verificationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Verification request not found.' });
    }

    const verificationData = verificationResult.rows[0];

    if (!verifyCode(verificationCode, verificationData.verification_code)) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    const insertUserQuery = `
      INSERT INTO users (email, username, first_name, last_name, password_hash, created_at)
      VALUES ($1, $2, $3, $4, $5, $6);
    `;
    await client.query(insertUserQuery, [
      verificationData.email,
      verificationData.username,
      verificationData.first_name,
      verificationData.last_name,
      verificationData.password_hash,
      new Date()
    ]);

    const deleteVerificationQuery = `
      DELETE FROM verification_requests 
      WHERE id = $1;
    `;
    await client.query(deleteVerificationQuery, [verificationData.id]);

    res.status(200).json({ message: 'Email verified and user created successfully.' });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Error verifying email: ' + error.message });
  } finally {
    client.release();
  }
};

module.exports = { verifyEmail };