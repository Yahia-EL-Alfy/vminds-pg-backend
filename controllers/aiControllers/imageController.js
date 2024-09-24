const { generateImage } = require("../../ai_models/imageGen");
const pool = require('../../config/database');
const { updateAiToolUsage,updateTokenUsagePoints,updateImageCountAndPoints,updateLoginStreak} = require('../pointController');


const handleImageRequest = async (req, res) => {
  const { prompt, model, imageSize, numInferenceSteps, guidanceScale, numImages, safetyTolerance } = req.body;
  const userId = req.userId; 

  if (!prompt || !model) {
    return res.status(400).json({ error: "Prompt and model are required." });
  }

  try {
    const client = await pool.connect();

    const userQuery = 'SELECT available_tokens FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];

    const modelQuery = 'SELECT tokens FROM modelTokens WHERE model = $1';
    const modelResult = await client.query(modelQuery, [model]);

    if (modelResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "Model not found." });
    }

    const modelTokens = modelResult.rows[0].tokens;

    if (user.available_tokens < modelTokens) {
      client.release();
      return res.status(403).json({ error: "Insufficient tokens." });
    }

    const imageUrl = await generateImage(prompt, model, { 
      image_size: imageSize,
      num_inference_steps: numInferenceSteps,
      guidance_scale: guidanceScale,
      num_images: numImages,
      safety_tolerance: safetyTolerance
    });

    const updateTokensQuery = `
      UPDATE users
      SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
      WHERE id = $2
    `;
    await client.query(updateTokensQuery, [modelTokens, userId]);

    const logQuery = `
      INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
      VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        `;
    const logResult = await client.query(logQuery, [userId, 'image_generation', prompt, imageUrl, modelTokens]);
    const logId = logResult.rows[0].id;

        const imagecountres = await updateImageCountAndPoints(userId);

        // Update AI tool usage and get the reward response
        const usageUpdateResult = await updateAiToolUsage(userId, model);

        // Update token usage points
        const tokenUsageRes = await updateTokenUsagePoints(userId);
         await updateLoginStreak(userId);

    client.release();
    res.setHeader('Log-ID', logId); 
    return res.status(200).json({ 
      imageUrl,
      usageUpdate: usageUpdateResult,
      tokenUsage: tokenUsageRes,
      imagePoints: imagecountres

     });
  } catch (error) {
    console.error("Error in handleImageRequest:", error);
    return res.status(500).json({ error: "Failed to generate image." });
  }
};

module.exports = {
  handleImageRequest,
};
