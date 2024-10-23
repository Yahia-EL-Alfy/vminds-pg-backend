const pool = require('../../config/database');
const { analyzeImage , analyzeLocalImage} = require("../../ai_models/analyseImg");
const { updateAiToolUsage, updateTokenUsagePoints, updateLoginStreak } = require('../pointController');
const model = "gpt-4o";

const handleImageAnalysisRequest = async (req, res) => {
    const { text, imageUrls, chatToken } = req.body; 
    const userId = req.userId;

    if (!text || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: "Text and at least one image URL are required." });
    }

    const client = await pool.connect();
    try {
        // Start a transaction
        await client.query('BEGIN');

        const userQuery = 'SELECT available_tokens, tokens_used FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];

        // Perform image analysis first
        const { responseText, tokensUsed } = await analyzeImage(text, imageUrls);

        // Check if user has enough tokens
        if (user.available_tokens < tokensUsed) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        let finalChatToken = chatToken;
        let newChatLogId;

        // Check if chatToken exists
        if (chatToken) {
            const chatTokenQuery = 'SELECT id FROM chat_logs WHERE chat_token = $1 LIMIT 1';
            const chatTokenResult = await client.query(chatTokenQuery, [chatToken]);

            if (chatTokenResult.rows.length > 0) {
                const appendChatLogQuery = `
                    INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;
                `;
                const appendChatLogResult = await client.query(appendChatLogQuery, [userId, chatToken, text, responseText, model]);
                newChatLogId = appendChatLogResult.rows[0].id;
            } else {
                // Generate a new chat token if the provided one doesn't exist
                finalChatToken = require('crypto').randomUUID();
                const newChatLogQuery = `
                    INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;
                `;
                const newChatLogResult = await client.query(newChatLogQuery, [userId, finalChatToken, text, responseText, model]);
                newChatLogId = newChatLogResult.rows[0].id;
            }
        } else {
            finalChatToken = require('crypto').randomUUID();
            const newChatLogQuery = `
                INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;
            `;
            const newChatLogResult = await client.query(newChatLogQuery, [userId, finalChatToken, text, responseText, model]);
            newChatLogId = newChatLogResult.rows[0].id;
        }

        // Update tokens
        const updateTokensQuery = `
            UPDATE users
            SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
            WHERE id = $2
        `;
        await client.query(updateTokensQuery, [tokensUsed, userId]);

        // Log the usage
        const logQuery = `
            INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const logResult = await client.query(logQuery, [userId, model, text, responseText, tokensUsed]);
        const logId = logResult.rows[0].id;

        await client.query(`
            UPDATE chat_logs
            SET log_id = $1
            WHERE id = $2
        `, [logId, newChatLogId]);

        const usageUpdateResult = await updateAiToolUsage(client, userId, model);
        const tokenUsageRes = await updateTokenUsagePoints(userId,client);
        await updateLoginStreak(userId, client);

        // Commit the transaction
        await client.query('COMMIT');
        return res.status(200).json({
            response: responseText,
            tokensUsed,
            chatToken: finalChatToken,
            logId,
            messageId: newChatLogId,
            usageUpdate: usageUpdateResult,
            tokenUsage: tokenUsageRes
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in handleImageAnalysisRequest:", error);
        return res.status(500).json({ error: "Failed to analyze image." });
    } finally {
        client.release(); // Always release the client
    }
};

const handleLocalImageAnalysisRequest = async (req, res) => {
    const { text, chatToken } = req.body;
    const userId = req.userId;

    if (!text || !req.file) {
        return res.status(400).json({ error: "Text and image file are required." });
    }

    const client = await pool.connect();
    try {
        // Start a transaction
        await client.query('BEGIN');

        const userQuery = 'SELECT available_tokens, tokens_used FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];

        // Perform local image analysis
        const { responseText, tokensUsed } = await analyzeLocalImage(text, req.file.buffer);

        // Check if user has enough tokens
        if (user.available_tokens < tokensUsed) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        let finalChatToken = chatToken;
        let newChatLogId;

        // Check if chatToken exists
        if (chatToken) {
            const chatTokenQuery = 'SELECT id FROM chat_logs WHERE chat_token = $1 LIMIT 1';
            const chatTokenResult = await client.query(chatTokenQuery, [chatToken]);

            if (chatTokenResult.rows.length > 0) {
                const appendChatLogQuery = `
                    INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;
                `;
                const appendChatLogResult = await client.query(appendChatLogQuery, [userId, chatToken, text, responseText, model]);
                newChatLogId = appendChatLogResult.rows[0].id;
            } else {
                // Generate a new chat token if the provided one doesn't exist
                finalChatToken = require('crypto').randomUUID();
                const newChatLogQuery = `
                    INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;
                `;
                const newChatLogResult = await client.query(newChatLogQuery, [userId, finalChatToken, text, responseText, model]);
                newChatLogId = newChatLogResult.rows[0].id;
            }
        } else {
            finalChatToken = require('crypto').randomUUID();
            const newChatLogQuery = `
                INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;
            `;
            const newChatLogResult = await client.query(newChatLogQuery, [userId, finalChatToken, text, responseText, model]);
            newChatLogId = newChatLogResult.rows[0].id;
        }

        // Update tokens
        const updateTokensQuery = `
            UPDATE users
            SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
            WHERE id = $2
        `;
        await client.query(updateTokensQuery, [tokensUsed, userId]);

        // Log the usage
        const logQuery = `
            INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const logResult = await client.query(logQuery, [userId, model, text, responseText, tokensUsed]);
        const logId = logResult.rows[0].id;

        await client.query(`
            UPDATE chat_logs
            SET log_id = $1
            WHERE id = $2
        `, [logId, newChatLogId]);

        const usageUpdateResult = await updateAiToolUsage(userId, model);
        const tokenUsageRes = await updateTokenUsagePoints(userId);
        await updateLoginStreak(userId);

        // Commit the transaction
        await client.query('COMMIT');
        client.release();

        return res.status(200).json({
            response: responseText,
            tokensUsed,
            chatToken: finalChatToken,
            logId,
            messageId: newChatLogId,
            usageUpdate: usageUpdateResult,
            tokenUsage: tokenUsageRes
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in handleLocalImageAnalysisRequest:", error);
        return res.status(500).json({ error: "Failed to analyze image." });
    } finally {
        client.release(); // Always release the client
    }
};

module.exports = { handleImageAnalysisRequest, handleLocalImageAnalysisRequest };
