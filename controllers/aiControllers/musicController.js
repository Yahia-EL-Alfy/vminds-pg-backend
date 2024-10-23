const pool = require('../../config/database');
const { generateMusic } = require('../../ai_models/musicModel');
const { fetchMusicDetails } = require('../../ai_models/musicModel');
const { generateCustomMusic } = require('../../ai_models/musicModel');
const model = "chirp-v3.5";
const { updateAiToolUsage,updateTokenUsagePoints,updateLoginStreak } = require('../pointController');


const handleMusicGenerationRequest = async (req, res) => {
    const { prompt, makeInstrumental, waitAudio, chatToken } = req.body; 
    const userId = req.userId;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
    }

    const client = await pool.connect();
    try {
        // Start a transaction
        await client.query('BEGIN');

        // Fetch user tokens
        const userQuery = 'SELECT available_tokens, tokens_used FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];
        const tokensRequired = 157000;  // Example token cost

        // Check if user has enough tokens
        if (user.available_tokens < tokensRequired) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        // Call the music generation API
        const musicResponse = await generateMusic(prompt, makeInstrumental, waitAudio);

        if (!Array.isArray(musicResponse) || musicResponse.length < 2) {
            throw new Error('Invalid music response format.');
        }

        const newMusicIds = [musicResponse[0].id, musicResponse[1].id];

        // Fetch or update user music data
        const existingMusicQuery = 'SELECT music_ids FROM user_music WHERE user_id = $1';
        const existingMusicResult = await client.query(existingMusicQuery, [userId]);

        if (existingMusicResult.rows.length > 0) {
            const existingMusicIds = existingMusicResult.rows[0].music_ids;
            const updatedMusicIds = existingMusicIds.concat(newMusicIds);

            const updateMusicQuery = 'UPDATE user_music SET music_ids = $1 WHERE user_id = $2';
            await client.query(updateMusicQuery, [JSON.stringify(updatedMusicIds), userId]);
        } else {
            const insertMusicQuery = 'INSERT INTO user_music (user_id, music_ids) VALUES ($1, $2)';
            await client.query(insertMusicQuery, [userId, JSON.stringify(newMusicIds)]);
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
                const appendChatLogResult = await client.query(appendChatLogQuery, [userId, chatToken, prompt, JSON.stringify(musicResponse), 'music_generation']);
                newChatLogId = appendChatLogResult.rows[0].id;
            } else {
                // Generate a new chat token if the provided one doesn't exist
                finalChatToken = crypto.randomUUID();
                const newChatLogQuery = `
                    INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;
                `;
                const newChatLogResult = await client.query(newChatLogQuery, [userId, finalChatToken, prompt, JSON.stringify(musicResponse), 'music_generation']);
                newChatLogId = newChatLogResult.rows[0].id;
            }
        } else {
            finalChatToken = crypto.randomUUID();
            const newChatLogQuery = `
                INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;
            `;
            const newChatLogResult = await client.query(newChatLogQuery, [userId, finalChatToken, prompt, JSON.stringify(musicResponse), 'music_generation']);
            newChatLogId = newChatLogResult.rows[0].id;
        }

        // Update tokens used and available
        const updateTokensQuery = `
            UPDATE users 
            SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
            WHERE id = $2;
        `;
        await client.query(updateTokensQuery, [tokensRequired, userId]);

        // Log the usage in usage_logs
        const logQuery = `
            INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const logResult = await client.query(logQuery, [userId, 'music_generation', prompt, JSON.stringify(musicResponse), tokensRequired]);
        const logId = logResult.rows[0].id;

        // Update chat logs with log_id
        await client.query(`UPDATE chat_logs SET log_id = $1 WHERE id = $2`, [logId, newChatLogId]);

        // Update image/music count, AI tool usage, and token usage points
        const usageUpdateRes = await updateAiToolUsage(client, userId, model);
        const tokenUsageRes = await updateTokenUsagePoints(userId, client);
        await updateLoginStreak(userId, client);

        // Commit the transaction
        await client.query('COMMIT');

        return res.status(200).json({
            music1: {
                id: musicResponse[0].id,
                url: musicResponse[0].audio_url,
                image_url: musicResponse[0].image_url,
                title: musicResponse[0].title,
                model_name: musicResponse[0].model_name,
                tags: musicResponse[0].tags,
            },
            music2: {
                id: musicResponse[1].id,
                url: musicResponse[1].audio_url,
                image_url: musicResponse[1].image_url,
                title: musicResponse[1].title,
                model_name: musicResponse[1].model_name,
                tags: musicResponse[1].tags,
            },
            tokensUsed: tokensRequired,
            chatToken: finalChatToken,
            logId,
            messageId: newChatLogId,
            usageUpdate: usageUpdateRes,
            tokenUsage: tokenUsageRes
            });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in handleMusicGenerationRequest:", error);
        return res.status(500).json({ error: "Failed to process music generation request." });
    } finally {
        client.release();
    }
};

const getUserMusicDetails = async (req, res) => {
    const userId = req.userId;

    try {
        const client = await pool.connect();
        const userMusicQuery = 'SELECT music_ids FROM user_music WHERE user_id = $1';
        const userMusicResult = await client.query(userMusicQuery, [userId]);

        if (userMusicResult.rows.length === 0) {
            client.release();
            return res.status(404).json({ error: "No music found for this user." });
        }

        const musicIds = userMusicResult.rows[0].music_ids;

        // Break down into smaller batches
        const musicDetailsPromises = [];
        const batchSize = 5;
        for (let i = 0; i < musicIds.length; i += batchSize) {
            const batch = musicIds.slice(i, i + batchSize);
            musicDetailsPromises.push(fetchMusicDetails(batch));
        }

        const musicDetailsArray = await Promise.all(musicDetailsPromises);
        const musicDetails = musicDetailsArray.flat();

        client.release();

        return res.status(200).json({ musicDetails });
    } catch (error) {
        console.error("Error in getUserMusicDetails:", error.message);
        return res.status(500).json({ error: "Failed to fetch music details." });
    }
};
const handleCustomMusicGenerationRequest = async (req, res) => {
    const { prompt, tags, title, makeInstrumental, waitAudio, chatToken } = req.body;
    const userId = req.userId;

    if (!prompt || !title || !tags) {
        return res.status(400).json({ error: "Prompt, title, and tags are required." });
    }

    const client = await pool.connect();
    try {
        // Start transaction
        await client.query('BEGIN');

        // Fetch user tokens
        const userQuery = 'SELECT available_tokens, tokens_used FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "User not found." });
        }

        const user = userResult.rows[0];
        const tokensRequired = 157000;

        // Check if user has enough tokens
        if (user.available_tokens < tokensRequired) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        // Generate music with custom settings
        const musicResponse = await generateCustomMusic(prompt, tags, title, makeInstrumental, waitAudio);
        const newMusicIds = [musicResponse[0].id, musicResponse[1].id];

        // Handle chat token logic
        let finalChatToken = chatToken;
        let newChatLogId;

        // Check if chatToken exists
        if (chatToken) {
            const chatTokenQuery = 'SELECT id FROM chat_logs WHERE chat_token = $1 LIMIT 1';
            const chatTokenResult = await client.query(chatTokenQuery, [chatToken]);

            if (chatTokenResult.rows.length > 0) {
                // Append to existing chat
                const appendChatLogQuery = `
                    INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;
                `;
                const appendChatLogResult = await client.query(appendChatLogQuery, [userId, chatToken, prompt, JSON.stringify(musicResponse), model]);
                newChatLogId = appendChatLogResult.rows[0].id;
            } else {
                // Create new chat token
                finalChatToken = require('crypto').randomUUID();
                const newChatLogQuery = `
                    INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id;
                `;
                const newChatLogResult = await client.query(newChatLogQuery, [userId, finalChatToken, prompt, JSON.stringify(musicResponse), model]);
                newChatLogId = newChatLogResult.rows[0].id;
            }
        } else {
            // Generate a new chat token if not provided
            finalChatToken = require('crypto').randomUUID();
            const newChatLogQuery = `
                INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id;
            `;
            const newChatLogResult = await client.query(newChatLogQuery, [userId, finalChatToken, prompt, JSON.stringify(musicResponse), model]);
            newChatLogId = newChatLogResult.rows[0].id;
        }

        // Update music data for user
        const existingMusicQuery = 'SELECT music_ids FROM user_music WHERE user_id = $1';
        const existingMusicResult = await client.query(existingMusicQuery, [userId]);

        if (existingMusicResult.rows.length > 0) {
            const existingMusicIds = existingMusicResult.rows[0].music_ids;
            const updatedMusicIds = existingMusicIds.concat(newMusicIds);

            const updateMusicQuery = 'UPDATE user_music SET music_ids = $1 WHERE user_id = $2';
            await client.query(updateMusicQuery, [JSON.stringify(updatedMusicIds), userId]);
        } else {
            const insertMusicQuery = 'INSERT INTO user_music (user_id, music_ids) VALUES ($1, $2)';
            await client.query(insertMusicQuery, [userId, JSON.stringify(newMusicIds)]);
        }

        // Update user tokens
        const updateTokensQuery = `
            UPDATE users
            SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
            WHERE id = $2
        `;
        await client.query(updateTokensQuery, [tokensRequired, userId]);

        // Log usage in usage_logs
        const logQuery = `
            INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
        const logResult = await client.query(logQuery, [userId, model, prompt, JSON.stringify(musicResponse), tokensRequired]);
        const logId = logResult.rows[0].id;

        // Update log reference in chat_logs
        await client.query('UPDATE chat_logs SET log_id = $1 WHERE id = $2', [logId, newChatLogId]);

        const usageUpdateRes = await updateAiToolUsage(client, userId, model);
        const tokenUsageRes = await updateTokenUsagePoints(userId, client);
        await updateLoginStreak(userId, client);

        // Commit transaction
        await client.query('COMMIT');

        // Set log ID in the response header
        res.setHeader('Log-ID', logId);

        return res.status(200).json({
            music1: {
                id: musicResponse[0].id,
                url: musicResponse[0].audio_url,
                image_url: musicResponse[0].image_url,
                title: musicResponse[0].title,
                model_name: musicResponse[0].model_name,
                tags: musicResponse[0].tags,
            },
            music2: {
                id: musicResponse[1].id,
                url: musicResponse[1].audio_url,
                image_url: musicResponse[1].image_url,
                title: musicResponse[1].title,
                model_name: musicResponse[1].model_name,
                tags: musicResponse[1].tags,
            },
            tokensUsed: tokensRequired,
            chatToken: finalChatToken,
            logId,
            messageId: newChatLogId,
            usageUpdate: usageUpdateRes,
            tokenUsage: tokenUsageRes
        });

    } catch (error) {
        // Rollback in case of error
        await client.query('ROLLBACK');
        console.error("Error in handleCustomMusicGenerationRequest:", error);
        return res.status(500).json({ error: "Failed to process custom music generation request." });
    } finally {
        client.release();
    }
};



module.exports = {
    handleMusicGenerationRequest,
    getUserMusicDetails,
    handleCustomMusicGenerationRequest
};

