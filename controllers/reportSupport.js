const pool = require('../config/database');

const handleReportSubmission = async (req, res) => {
    const { log_id, comment } = req.body;
    const userId = req.userId;

    if (!log_id) {
        return res.status(400).json({ error: "log_id is required." });
    }

    try {
        const client = await pool.connect();

        const logQuery = 'SELECT id FROM usage_logs WHERE id = $1';
        const logResult = await client.query(logQuery, [log_id]);

        if (logResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: "Log entry not found." });
        }

        const userQuery = 'SELECT id FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: "User not found." });
        }

        const insertReportQuery = `
            INSERT INTO report (log_id, user_id, comment)
            VALUES ($1, $2, $3)
        `;
        await client.query(insertReportQuery, [log_id, userId, comment || null]);

        client.release();

        return res.status(200).json({ message: "Report submitted successfully." });
    } catch (error) {
        console.error("Error in handleReportSubmission:", error);
        return res.status(500).json({ error: "Failed to submit report." });
    }
};

module.exports = {
    handleReportSubmission,
};
