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

        try {
            // Start transaction
            await client.query('BEGIN');

            // Get the token requirement for the model and user tokens in a single query
            const tokenQuery = `
                SELECT 
                    mt.tokens AS model_tokens, 
                    u.available_tokens 
                FROM modelTokens mt 
                JOIN users u ON u.id = $1 
                WHERE mt.model = $2
            `;
            const tokenResult = await client.query(tokenQuery, [userId, model]);

            if (tokenResult.rows.length === 0) {
                throw new Error("Model not found or User not found.");
            }

            const { model_tokens: tokensRequired, available_tokens: userTokens } = tokenResult.rows[0];

            // Check if the user has enough tokens
            if (userTokens < tokensRequired) {
                throw new Error("Insufficient tokens.");
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
            const imageCountRes = await updateImageCountAndPoints(userId, client);
            const usageUpdateRes = await updateAiToolUsage(client, userId, model);
            const tokenUsageRes = await updateTokenUsagePoints(userId, client);
            await updateLoginStreak(userId, client);

            // Commit transaction
            await client.query('COMMIT');

            // Return response
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
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error in handleDalleImage:", error);
        return res.status(500).json({ error: "Failed to generate image." });
    }
};

module.exports = {
    handleDalleImage,
};
