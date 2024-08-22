const pool = require('../../config/database');
const { generateMusic } = require('../../ai_models/musicModel');
const { fetchMusicDetails } = require('../../ai_models/musicModel');
const { generateCustomMusic } = require('../../ai_models/musicModel');


const handleMusicGenerationRequest = async (req, res) => {
    const { prompt, makeInstrumental, waitAudio } = req.body;
    const userId = req.userId;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
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
        const tokensRequired = 200000;  

        if (user.available_tokens < tokensRequired) {
            client.release();
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        const musicResponse = await generateMusic(prompt, makeInstrumental, waitAudio);

        const newMusicIds = [musicResponse[0].id, musicResponse[1].id];

        const existingMusicQuery = `
            SELECT music_ids FROM user_music WHERE user_id = $1
        `;
        const existingMusicResult = await client.query(existingMusicQuery, [userId]);

        if (existingMusicResult.rows.length > 0) {
            const existingMusicIds = existingMusicResult.rows[0].music_ids;
            const updatedMusicIds = existingMusicIds.concat(newMusicIds);

            const updateMusicQuery = `
                UPDATE user_music
                SET music_ids = $1
                WHERE user_id = $2
            `;
            await client.query(updateMusicQuery, [JSON.stringify(updatedMusicIds), userId]);
        } else {
            const insertMusicQuery = `
                INSERT INTO user_music (user_id, music_ids)
                VALUES ($1, $2)
            `;
            await client.query(insertMusicQuery, [userId, JSON.stringify(newMusicIds)]);
        }

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
        await client.query(logQuery, [userId, 'music-generation', prompt, JSON.stringify(musicResponse), tokensRequired]);

        client.release();

        return res.status(200).json({
            music1: {
                id: musicResponse[0].id,
                url: musicResponse[0].audio_url,
                title: musicResponse[0].title,
                model_name: musicResponse[0].model_name,
                tags: musicResponse[0].tags,
            },
            music2: {
                id: musicResponse[1].id,
                url: musicResponse[1].audio_url,
                title: musicResponse[1].title,
                model_name: musicResponse[1].model_name,
                tags: musicResponse[1].tags,
            },
            tokensUsed: tokensRequired
        });
    } catch (error) {
        console.error("Error in handleMusicGenerationRequest:", error);
        return res.status(500).json({ error: "Failed to process music generation request." });
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

        const musicDetails = await fetchMusicDetails(musicIds);

        client.release();

        return res.status(200).json({ musicDetails });
    } catch (error) {
        console.error("Error in getUserMusicDetails:", error.message);
        return res.status(500).json({ error: "Failed to fetch music details." });
    }
};


const handleCustomMusicGenerationRequest = async (req, res) => {
    const { prompt, tags, title, makeInstrumental, waitAudio } = req.body;
    const userId = req.userId;

    if (!prompt || !title || !tags) {
        return res.status(400).json({ error: "Prompt, title, and tags are required." });
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
        const tokensRequired = 200000;  

        if (user.available_tokens < tokensRequired) {
            client.release();
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        const musicResponse = await generateCustomMusic(prompt, tags, title, makeInstrumental, waitAudio);

        const newMusicIds = [musicResponse[0].id, musicResponse[1].id];

        const existingMusicQuery = `
            SELECT music_ids FROM user_music WHERE user_id = $1
        `;
        const existingMusicResult = await client.query(existingMusicQuery, [userId]);

        if (existingMusicResult.rows.length > 0) {
            const existingMusicIds = existingMusicResult.rows[0].music_ids;
            const updatedMusicIds = existingMusicIds.concat(newMusicIds);

            const updateMusicQuery = `
                UPDATE user_music
                SET music_ids = $1
                WHERE user_id = $2
            `;
            await client.query(updateMusicQuery, [JSON.stringify(updatedMusicIds), userId]);
        } else {
            const insertMusicQuery = `
                INSERT INTO user_music (user_id, music_ids)
                VALUES ($1, $2)
            `;
            await client.query(insertMusicQuery, [userId, JSON.stringify(newMusicIds)]);
        }

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
        await client.query(logQuery, [userId, 'custom-music-generation', prompt, JSON.stringify(musicResponse), tokensRequired]);

        client.release();

        return res.status(200).json({
            music1: {
                id: musicResponse[0].id,
                url: musicResponse[0].audio_url,
                title: musicResponse[0].title,
                model_name: musicResponse[0].model_name,
                tags: musicResponse[0].tags,
            },
            music2: {
                id: musicResponse[1].id,
                url: musicResponse[1].audio_url,
                title: musicResponse[1].title,
                model_name: musicResponse[1].model_name,
                tags: musicResponse[1].tags,
            },
            tokensUsed: tokensRequired
        });
    } catch (error) {
        console.error("Error in handleCustomMusicGenerationRequest:", error);
        return res.status(500).json({ error: "Failed to process custom music generation request." });
    }
};

module.exports = {
    handleMusicGenerationRequest,
    getUserMusicDetails,
    handleCustomMusicGenerationRequest
};

