const { generateImage } = require("../../ai_models/simpleImageGen");
const pool = require('../../config/database');

const handleSimpleImage = async (req, res) => {
  const { prompt, model } = req.body;
  const userId = req.userId; 

  if (!prompt || !model) {
    return res.status(400).json({ error: "Prompt and model are required." });
  }

  try {
    const client = await pool.connect();

    const tokenQuery = 'SELECT tokens FROM modelTokens WHERE model = $1';
    const tokenResult = await client.query(tokenQuery, [model]);

    if (tokenResult.rows.length === 0) {
      client.release();
      return res.status(400).json({ error: "Model not found." });
    }

    const tokensRequired = tokenResult.rows[0].tokens;

    const userQuery = 'SELECT available_tokens FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];

    if (user.available_tokens < tokensRequired) {
      client.release();
      return res.status(403).json({ error: "Insufficient tokens." });
    }

    const imageBase64 = await generateImage(prompt, model);

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
    await client.query(logQuery, [userId, 'simple_image_generation', prompt, imageBase64, tokensRequired]);

    client.release();

    res.setHeader('Content-Type', 'image/png');
    
    const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    res.status(200).send(imageBuffer);
  } catch (error) {
    console.error("Error in handleSimpleImage:", error);
    return res.status(500).json({ error: "Failed to generate image." });
  }
};

module.exports = {
  handleSimpleImage,
};
