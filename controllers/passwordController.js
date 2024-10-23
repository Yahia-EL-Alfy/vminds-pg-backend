const bcrypt = require('bcrypt'); // Make sure to install bcrypt for password hashing
const pool = require('../config/database');
const crypto = require('crypto');
const { sendResetPasswordEmail } = require('../utils/mailer');

const resetPassword = async (req, res) => {
    const userId = req.userId; // Assuming userId is extracted from the request after authentication
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    // Check for required fields
    if (!oldPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ error: "Old password, new password, and confirmation are required." });
    }

    // Check if new password matches confirmation
    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: "New password and confirmation do not match." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // Fetch the user's hashed password from the database
        const userQuery = `SELECT password_hash FROM users WHERE id = $1;`;
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK'); // Rollback in case of an error
            return res.status(404).json({ error: "User not found." });
        }

        const hashedPassword = userResult.rows[0].password_hash;

        // Compare old password with the hashed password
        const isMatch = await bcrypt.compare(oldPassword, hashedPassword);
        if (!isMatch) {
            await client.query('ROLLBACK'); // Rollback in case of an error
            return res.status(400).json({ error: "Old password is incorrect." });
        }

        // Hash the new password
        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the database
        const updateQuery = `UPDATE users SET password_hash = $1 WHERE id = $2;`;
        await client.query(updateQuery, [newHashedPassword, userId]);

        await client.query('COMMIT'); // Commit transaction if everything is successful
        return res.status(200).json({ message: "Password updated successfully." });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback in case of an error
        console.error("Error resetting password:", error);
        return res.status(500).json({ error: "Internal server error." });
    } finally {
        client.release(); // Always release the client
    }
};

const requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // Check if user exists
        const userQuery = `SELECT id FROM users WHERE email = $1;`;
        const userResult = await client.query(userQuery, [email]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK'); // Rollback in case of an error
            return res.status(404).json({ error: "User not found." });
        }

        const userId = userResult.rows[0].id;

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour expiration

        // Insert reset token into the reset_password table
        const tokenInsertQuery = `
            INSERT INTO reset_password (user_id, reset_token, expires_at)
            VALUES ($1, $2, $3)
        `;
        await client.query(tokenInsertQuery, [userId, resetToken, expiresAt]);

        // Send password reset email
        await sendResetPasswordEmail(email, resetToken);

        await client.query('COMMIT'); // Commit transaction if everything is successful
        return res.status(200).json({ message: "Password reset email sent." });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback in case of an error
        console.error("Error requesting password reset:", error);
        return res.status(500).json({ error: "Internal server error." });
    } finally {
        client.release(); // Always release the client
    }
};

const confirmPasswordReset = async (req, res) => {
    const { resetToken, newPassword, confirmNewPassword } = req.body;

    if (!resetToken || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ error: "Token, new password, and confirmation are required." });
    }

    if (newPassword !== confirmNewPassword) {
        return res.status(400).json({ error: "New password and confirmation do not match." });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Start transaction

        // Check if the reset token is valid and not expired
        const tokenQuery = `
            SELECT user_id, expires_at, used 
            FROM reset_password 
            WHERE reset_token = $1;
        `;
        const tokenResult = await client.query(tokenQuery, [resetToken]);

        if (tokenResult.rows.length === 0) {
            await client.query('ROLLBACK'); // Rollback in case of an error
            return res.status(400).json({ error: "Invalid or expired reset token." });
        }

        const { user_id, expires_at, used } = tokenResult.rows[0];

        if (used || new Date() > expires_at) {
            await client.query('ROLLBACK'); // Rollback in case of an error
            return res.status(400).json({ error: "Token has expired or has already been used." });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        const updatePasswordQuery = `
            UPDATE users 
            SET password_hash = $1 
            WHERE id = $2;
        `;
        await client.query(updatePasswordQuery, [hashedPassword, user_id]);

        // Mark the token as used
        const updateTokenQuery = `
            UPDATE reset_password 
            SET used = TRUE 
            WHERE reset_token = $1;
        `;
        await client.query(updateTokenQuery, [resetToken]);

        await client.query('COMMIT'); // Commit transaction if everything is successful
        return res.status(200).json({ message: "Password updated successfully." });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback in case of an error
        console.error("Error resetting password:", error);
        return res.status(500).json({ error: "Internal server error." });
    } finally {
        client.release(); // Always release the client
    }
};

module.exports = { 
    resetPassword,
    requestPasswordReset,
    confirmPasswordReset
};
