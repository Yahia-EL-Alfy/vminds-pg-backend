const pool = require('../../config/database');
const { convertTextToSpeech } = require('../../ai_models/speechModel');
const { updateAiToolUsage, updateTokenUsagePoints, updateLoginStreak } = require('../pointController');

const handleTextToSpeechRequest = async (req, res) => {
    const { text, model, chatToken } = req.body;
    const userId = req.userId;

    if (!text || !model) {
        return res.status(400).json({ error: "Text and model are required." });
    }

    const client = await pool.connect();

    try {
        // Start transaction
        await client.query('BEGIN');

        const userQuery = 'SELECT available_tokens, tokens_used FROM users WHERE id = $1 FOR UPDATE';  // Lock the row for update
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];

        // Convert text to speech and get audio data
        const { audioData, tokensUsed, durationInSeconds } = await convertTextToSpeech(model, text);

        if (user.available_tokens < tokensUsed) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        // Handle the chat token logic
        let finalChatToken = chatToken;
        let newChatLogId;

        const chatLogQuery = `
            INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        
        if (chatToken) {
            const chatTokenCheckQuery = 'SELECT id FROM chat_logs WHERE chat_token = $1 LIMIT 1';
            const chatTokenResult = await client.query(chatTokenCheckQuery, [chatToken]);

            if (chatTokenResult.rows.length > 0) {
                newChatLogId = await client.query(chatLogQuery, [userId, chatToken, text, audioData, model]);
            } else {
                finalChatToken = require('crypto').randomUUID();
                newChatLogId = await client.query(chatLogQuery, [userId, finalChatToken, text, audioData, model]);
            }
        } else {
            finalChatToken = require('crypto').randomUUID();
            newChatLogId = await client.query(chatLogQuery, [userId, finalChatToken, text, audioData, model]);
        }

        newChatLogId = newChatLogId.rows[0].id;

        // Batch updates in the user table to reduce the number of queries
        const updateUserTokensQuery = `
            UPDATE users
            SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
            WHERE id = $2;
        `;
        await client.query(updateUserTokensQuery, [tokensUsed, userId]);

        // Log the usage
        const usageLogQuery = `
            INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const logResult = await client.query(usageLogQuery, [userId, model, text, audioData, tokensUsed]);
        const logId = logResult.rows[0].id;

        // Update the log_id in chat_logs
        await client.query('UPDATE chat_logs SET log_id = $1 WHERE id = $2', [logId, newChatLogId]);

        // Perform point updates
        await updateAiToolUsage(client, userId, model);
        await updateTokenUsagePoints(userId, client);
        await updateLoginStreak(userId, client);

        // Commit the transaction
        await client.query('COMMIT');

        return res.status(200).json({
            audio: audioData,  // Return base64 audio
            chatToken: finalChatToken,  // Return the reused or newly generated chat token
            logId,
            messageId: newChatLogId
        });

    } catch (error) {
        // Rollback the transaction on error
        await client.query('ROLLBACK');
        console.error("Error in handleTextToSpeechRequest:", error);
        return res.status(500).json({ error: "Failed to process text to speech request." });
    } finally {
        client.release();
    }
};

module.exports = {
    handleTextToSpeechRequest,
};
