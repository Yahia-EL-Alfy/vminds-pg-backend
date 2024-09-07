const pool = require('../../config/database');
const { analyzeImage, analyzeLocalImage } = require("../../ai_models/analyseImg");
const { updateAiToolUsage,updateTokenUsagePoints,updateLoginStreak } = require('../pointController');
const model = "vision-model" ;


const handleImageAnalysisRequest = async (req, res) => {
    const { text, imageUrls } = req.body; 
    const userId = req.userId;

    if (!text || !Array.isArray(imageUrls) || imageUrls.length === 0) {
        return res.status(400).json({ error: "Text and at least one image URL are required." });
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
        if (user.available_tokens < 10000) {
            client.release();
            return res.status(403).json({ error: "Insufficient tokens." });
        }

        const { responseText, tokensUsed } = await analyzeImage(text, imageUrls);

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
        await updateAiToolUsage(userId, model);
        await updateTokenUsagePoints(userId);
        await updateLoginStreak(userId);


      
        client.release();

        return res.status(200).json({ response: responseText, tokensUsed });
    } catch (error) {
        console.error("Error in handleImageAnalysisRequest:", error);
        return res.status(500).json({ error: "Failed to analyze image." });
    }
};

const handleLocalImageAnalysisRequest = async (req, res) => {
  const { text } = req.body;
  const userId = req.userId;

  if (!text || !req.file) {
    return res.status(400).json({ error: "Text and image file are required." });
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

    if (user.available_tokens < 10000) {
      client.release();
      return res.status(403).json({ error: "Insufficient tokens." });
    }

    const { responseText, tokensUsed } = await analyzeLocalImage(text, req.file.buffer);

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
    await updateAiToolUsage(userId, model);
    await updateTokenUsagePoints(userId);
    await updateLoginStreak(userId);



    client.release();

    return res.status(200).json({ response: responseText, tokensUsed });
  } catch (error) {
    console.error("Error in handleLocalImageAnalysisRequest:", error);
    return res.status(500).json({ error: "Failed to analyze image." });
  }
};

module.exports = {
  handleLocalImageAnalysisRequest,
  handleImageAnalysisRequest,
};
