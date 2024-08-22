const pool = require('../../config/database');
const axios = require('axios');

const handleTextToSpeechRequest = async (req, res) => {
    const { text, model } = req.body;
    const userId = req.userId; 

    if (!text || !model) {
        return res.status(400).json({ error: "Text and model are required." });
    }

    try {
        const client = await pool.connect();

        const userQuery = 'SELECT available_tokens, tokens_used, max_tokens FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];
        const maxTokens = user.max_tokens;

        if (user.available_tokens < maxTokens) {
            client.release();
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        const url = 'https://api.aimlapi.com/tts';
        const headers = {
            'Authorization': `Bearer ${process.env.API_KEY}`,
            'Content-Type': 'application/json'
        };
        const payload = {
            'model': model,
            'text': text
        };

        const response = await axios.post(url, payload, { headers: headers, responseType: 'arraybuffer' });

        const tokensUsed = maxTokens;
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
        await client.query(logQuery, [userId, 'tts-model', text, 'Audio response', tokensUsed]);

        client.release();

        res.set({
            'Content-Type': 'audio/wav',
            'Content-Disposition': 'attachment; filename="output.wav"',
        });

        return res.status(200).send(response.data);
    } catch (error) {
        console.error("Error in handleTextToSpeechRequest:", error);
        return res.status(500).json({ error: "Failed to process text to speech request." });
    }
};

module.exports = {
    handleTextToSpeechRequest,
};
