const { generateImage } = require("../../ai_models/imageGen"); 
const pool = require('../../config/database');
const { updateAiToolUsage, updateTokenUsagePoints, updateImageCountAndPoints, updateLoginStreak } = require('../pointController');

const handleImageRequest = async (req, res) => {
  const { prompt, model, imageSize, numInferenceSteps, guidanceScale, numImages, safetyTolerance, chatToken } = req.body;
  const userId = req.userId;

  if (!prompt || !model) {
    return res.status(400).json({ error: "Prompt and model are required." });
  }

  const client = await pool.connect(); 

  try {
    await client.query('BEGIN'); 

    const userQuery = 'SELECT available_tokens FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];

    const modelQuery = 'SELECT tokens FROM modelTokens WHERE model = $1';
    const modelResult = await client.query(modelQuery, [model]);

    if (modelResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Model not found." });
    }

    const modelTokens = modelResult.rows[0].tokens;

    if (user.available_tokens < modelTokens) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: "Insufficient tokens." });
    }

    const imageUrl = await generateImage(prompt, model, { 
      image_size: imageSize,
      num_inference_steps: numInferenceSteps,
      guidance_scale: guidanceScale,
      num_images: numImages,
      safety_tolerance: safetyTolerance
    });

    // Use UPSERT to handle chat token creation or reuse in one query
    const chatLogQuery = `
    INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
  `;
  
  const finalChatToken = chatToken || require('crypto').randomUUID();
  const chatLogResult = await client.query(chatLogQuery, [userId, finalChatToken, prompt, imageUrl, model]);
  const newChatLogId = chatLogResult.rows[0].id;
  
    const logQuery = `
      INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const logResult = await client.query(logQuery, [userId, model, prompt, imageUrl, modelTokens]);
    const usageLogId = logResult.rows[0].id;

    await client.query(`
      UPDATE chat_logs
      SET log_id = $1
      WHERE id = $2
    `, [usageLogId, newChatLogId]);

    const updateTokensQuery = `
      UPDATE users
      SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
      WHERE id = $2
    `;
    await client.query(updateTokensQuery, [modelTokens, userId]);

    // Perform points and AI tool updates using a single transaction (pass the same client)
    const imageCountRes = await updateImageCountAndPoints(userId, client);
    const usageUpdateRes = await updateAiToolUsage(client , userId, model);
    const tokenUsageRes = await updateTokenUsagePoints(userId, client);
    await updateLoginStreak(userId, client);

    await client.query('COMMIT'); 

    return res.status(200).json({
      imageUrl,
      chatToken: finalChatToken, 
      log_id: usageLogId,
      message_id: newChatLogId,
      usageUpdate: usageUpdateRes,
      tokenUsage: tokenUsageRes,
      imagePoints: imageCountRes
    });

  } catch (error) {
    await client.query('ROLLBACK'); 
    console.error("Error in handleImageRequest:", error);
    return res.status(500).json({ error: "Failed to generate image." });
  } finally {
    client.release(); 
  }
};

module.exports = {
  handleImageRequest,
};
