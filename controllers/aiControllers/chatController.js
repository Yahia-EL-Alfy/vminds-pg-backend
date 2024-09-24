const { getAIResponse } = require("../../ai_models/chatgpt");
const pool = require('../../config/database');
const { updateAiToolUsage,updateTokenUsagePoints ,updateLoginStreak } = require('../pointController');

const handleChatRequest = async (req, res) => {
  const { message, model } = req.body;
  const userId = req.userId;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  try {
    const client = await pool.connect();

    // Fetch user data
    const userQuery = 'SELECT available_tokens, tokens_used, max_tokens FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];
    const maxTokens = user.max_tokens;

    // Check if the user has sufficient tokens
    if (user.available_tokens < maxTokens) {
      client.release();
      return res.status(403).json({ error: "Insufficient tokens." });
    }

    // Get AI response and tokens used
    const { responseText, tokensUsed } = await getAIResponse(message, model, maxTokens);

    // Update user's token usage
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
    const logResult = await client.query(logQuery, [userId, model, message, responseText, tokensUsed]);
    const logId = logResult.rows[0].id;

    // Update AI tool usage and get the reward response
    const usageUpdateResult = await updateAiToolUsage(userId, model);

    // Update token usage points
    const tokenUsageRes = await updateTokenUsagePoints(userId);
     await updateLoginStreak(userId);


    client.release();
    
    // Set the log ID in the response headers
    res.setHeader('Log-ID', logId);

    // Combine the AI response, tool usage update, and token usage update into a single JSON response
    return res.status(200).json({
      response: responseText,
      usageUpdate: usageUpdateResult,
      tokenUsage: tokenUsageRes
    });
  } catch (error) {
    console.error("Error in handleChatRequest:", error);
    return res.status(500).json({ error: "Failed to get AI response." });
  }
};

module.exports = {
  handleChatRequest,
};
