const { generateLumaVideo } = require('../../ai_models/lumaModel');
const pool = require('../../config/database');

const handleLumaGenerationRequest = async (req, res) => {
    const { userPrompt, aspectRatio, expandPrompt } = req.body;
    const userId = req.userId;

    if (!userPrompt) {
        return res.status(400).json({ error: "userPrompt is required." });
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
        const tokensRequired = 500000; 

        if (user.available_tokens < tokensRequired) {
            client.release();
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        const videoResponse = await generateLumaVideo(userPrompt, aspectRatio, expandPrompt);

        const updateTokensQuery = `
            UPDATE users
            SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
            WHERE id = $2
        `;
        await client.query(updateTokensQuery, [tokensRequired, userId]);

        const logQuery = `
            INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(logQuery, [userId, 'luma-ai-video-generation', userPrompt, JSON.stringify(videoResponse), tokensRequired]);

        client.release();

        return res.status(200).json({
            video_url: videoResponse.video_url,

        });
    } catch (error) {
        console.error("Error in handleLumaGenerationRequest:", error);
        return res.status(500).json({ error: "Failed to process video generation request." });
    }
};

module.exports = {
    handleLumaGenerationRequest
};
