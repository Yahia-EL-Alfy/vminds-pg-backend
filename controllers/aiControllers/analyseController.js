const pool = require('../../config/database');
const { analyzeImage } = require("../../ai_models/analyseImg");

const handleImageAnalysisRequest = async (req, res) => {
    const { text, imageUrl, maxTokens } = req.body;
    const userId = req.userId; 

    if (!text || !imageUrl) {
        return res.status(400).json({ error: "Text and Image URL are required." });
    }

    try {
        const client = await pool.connect();

        const userQuery = 'SELECT available_tokens, tokens_used FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];
        // console.log("available tokens : "+ user.available_tokens)
        if (user.available_tokens < 10000) {
            client.release();
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        const { responseText, tokensUsed } = await analyzeImage(text, imageUrl, maxTokens);

        const updateTokensQuery = `
            UPDATE users
            SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
            WHERE id = $2
        `;
        await client.query(updateTokensQuery, [tokensUsed, userId]);

        const logQuery = `
            INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(logQuery, [userId, 'vision-model', text, responseText, tokensUsed]);

        client.release();

        return res.status(200).json({ response: responseText, tokensUsed });
    } catch (error) {
        console.error("Error in handleImageAnalysisRequest:", error);
        return res.status(500).json({ error: "Failed to analyze image." });
    }
};

module.exports = {
    handleImageAnalysisRequest,
};
