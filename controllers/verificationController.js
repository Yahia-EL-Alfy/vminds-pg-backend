const pool = require('../config/database');
const { verifyCode } = require('../utils/verificationCode');

const verifyEmail = async (req, res) => {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
        return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const client = await pool.connect(); // Get a connection from the pool
    try {
        await client.query('BEGIN'); // Start a transaction

        // Fetch only the needed verification request fields
        const verificationQuery = `
            SELECT id, email, username, first_name, last_name, password_hash, verification_code
            FROM verification_requests 
            WHERE email = $1;
        `;
        const verificationResult = await client.query(verificationQuery, [email]);

        if (verificationResult.rows.length === 0) {
            await client.query('ROLLBACK'); // Rollback if no request found
            return res.status(404).json({ error: 'Verification request not found.' });
        }

        const verificationData = verificationResult.rows[0];

        // Verify the provided code matches the stored code
        if (!verifyCode(verificationCode, verificationData.verification_code)) {
            await client.query('ROLLBACK'); // Rollback on invalid code
            return res.status(400).json({ error: 'Invalid verification code.' });
        }

        // Insert the new user based on the verified data
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

        // Delete the verification request after successful user creation
        const deleteVerificationQuery = `
            DELETE FROM verification_requests 
            WHERE id = $1;
        `;
        await client.query(deleteVerificationQuery, [verificationData.id]);

        await client.query('COMMIT'); // Commit transaction

        return res.status(200).json({ message: 'Email verified and user created successfully.' });
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction on error
        console.error('Error verifying email:', error);
        return res.status(500).json({ error: 'Error verifying email: ' + error.message });
    } finally {
        client.release(); // Ensure the client is released
    }
};

module.exports = { verifyEmail };
