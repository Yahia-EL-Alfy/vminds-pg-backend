const { generateImage } = require("../../ai_models/dalle");
const pool = require('../../config/database');
const { updateAiToolUsage, updateTokenUsagePoints, updateImageCountAndPoints, updateLoginStreak } = require('../pointController');

const handleDalleImage = async (req, res) => {
    const { prompt, model, chatToken } = req.body;
    const userId = req.userId;

    if (!prompt || !model) {
        return res.status(400).json({ error: "Prompt and model are required." });
    }

    try {
        const client = await pool.connect();

        // Get the token requirement for the model
        const tokenQuery = 'SELECT tokens FROM modelTokens WHERE model = $1';
        const tokenResult = await client.query(tokenQuery, [model]);

        if (tokenResult.rows.length === 0) {
            client.release();
            return res.status(400).json({ error: "Model not found." });
        }

        const tokensRequired = tokenResult.rows[0].tokens;

        // Get user tokens
        const userQuery = 'SELECT available_tokens FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];

        // Check if the user has enough tokens
        if (user.available_tokens < tokensRequired) {
            client.release();
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        // Generate the image
        const imageUrl = await generateImage(prompt, model);

        let finalChatToken = chatToken;
        let newChatLogId;

        // Check if chatToken exists, reuse if available, otherwise create a new one
        if (chatToken) {
            const chatTokenQuery = 'SELECT id FROM chat_logs WHERE chat_token = $1 LIMIT 1';
            const chatTokenResult = await client.query(chatTokenQuery, [chatToken]);

            if (chatTokenResult.rows.length > 0) {
                // Append the new request and response to the existing chat session
                const appendChatLogQuery = `
                    INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;
                `;
                const appendChatLogResult = await client.query(appendChatLogQuery, [userId, chatToken, prompt, imageUrl, model]);
                newChatLogId = appendChatLogResult.rows[0].id;
            } else {
                // Generate a new chat token if the provided one doesn't exist
                finalChatToken = require('crypto').randomUUID();
                const newChatLogQuery = `
                    INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;
                `;
                const newChatLogResult = await client.query(newChatLogQuery, [userId, finalChatToken, prompt, imageUrl, model]);
                newChatLogId = newChatLogResult.rows[0].id;
            }
        } else {
            // No chatToken was provided, generate a new one
            finalChatToken = require('crypto').randomUUID();
            const newChatLogQuery = `
                INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;
            `;
            const newChatLogResult = await client.query(newChatLogQuery, [userId, finalChatToken, prompt, imageUrl, model]);
            newChatLogId = newChatLogResult.rows[0].id;
        }

        // Update the user's token balance
        const updateTokensQuery = `
            UPDATE users
            SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
            WHERE id = $2
        `;
        await client.query(updateTokensQuery, [tokensRequired, userId]);

        // Insert into usage_logs table
        const logQuery = `
            INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const logResult = await client.query(logQuery, [userId, 'simple_image_generation', prompt, imageUrl, tokensRequired]);
        const logId = logResult.rows[0].id;

        // Update chat_logs with the log_id reference
        await client.query(`
            UPDATE chat_logs
            SET log_id = $1
            WHERE id = $2
        `, [logId, newChatLogId]);

        // Update image count, AI tool usage, token usage points, and login streak
        const imageCountRes = await updateImageCountAndPoints(userId);
        const usageUpdateRes = await updateAiToolUsage(userId, model);
        const tokenUsageRes = await updateTokenUsagePoints(userId);
        await updateLoginStreak(userId);

        client.release();

        return res.status(200).json({ 
            imageUrl,
            chatToken: finalChatToken,  // Return the reused or newly generated chat token
            log_id: logId,
            message_id: newChatLogId,
            usageUpdate: usageUpdateRes,
            tokenUsage: tokenUsageRes,
            imagePoints: imageCountRes
        });

    } catch (error) {
        console.error("Error in handleDalleImage:", error);
        return res.status(500).json({ error: "Failed to generate image." });
    }
};

module.exports = {
    handleDalleImage,
};
