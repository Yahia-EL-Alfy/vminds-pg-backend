const { generateImage } = require("../../ai_models/dalle");
const pool = require('../../config/database');
const { updateAiToolUsage, updateTokenUsagePoints, updateImageCountAndPoints, updateLoginStreak } = require('../pointController');

const handleDalleImage = async (req, res) => {
    const { prompt, model } = req.body;
    const userId = req.userId;

    if (!prompt || !model) {
        return res.status(400).json({ error: "Prompt and model are required." });
    }

    try {
        const client = await pool.connect();

        const tokenQuery = 'SELECT tokens FROM modelTokens WHERE model = $1';
        const tokenResult = await client.query(tokenQuery, [model]);

        if (tokenResult.rows.length === 0) {
            client.release();
            return res.status(400).json({ error: "Model not found." });
        }

        const tokensRequired = tokenResult.rows[0].tokens;

        const userQuery = 'SELECT available_tokens FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];

        if (user.available_tokens < tokensRequired) {
            client.release();
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        const imageUrl = await generateImage(prompt, model);

        const updateTokensQuery = `
            UPDATE users
            SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
            WHERE id = $2
        `;
        await client.query(updateTokensQuery, [tokensRequired, userId]);

        const logQuery = `
            INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const logResult = await client.query(logQuery, [userId, 'simple_image_generation', prompt, imageUrl, tokensRequired]);
        const logId = logResult.rows[0].id;

        const imagecountres = await updateImageCountAndPoints(userId);

        const usageUpdateResult = await updateAiToolUsage(userId, model);

        const tokenUsageRes = await updateTokenUsagePoints(userId);
         await updateLoginStreak(userId);

        client.release();

        // Send the URL in the response instead of a Base64 image
        res.setHeader('Log-ID', logId); // Custom header to include log ID

        return res.status(200).json({ 
            imageUrl,
            usageUpdate: usageUpdateResult,
            tokenUsage: tokenUsageRes,
            imagePoints: imagecountres
      
           });
    } catch (error) {
        console.error("Error in handleSimpleImage:", error);
        return res.status(500).json({ error: "Failed to generate image." });
    }
};

module.exports = {
    handleDalleImage,
};
