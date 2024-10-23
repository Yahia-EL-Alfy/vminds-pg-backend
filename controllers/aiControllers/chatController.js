const { getAIResponse } = require("../../ai_models/chatgpt");
const pool = require('../../config/database');
const { updateAiToolUsage, updateTokenUsagePoints, updateLoginStreak } = require('../pointController');

// Helper function to build message history with a limit of the last 10 messages
const buildMessageHistory = async (memoryToken, newMessage, client) => {
  const messageHistoryQuery = `
    SELECT request, response
    FROM chat_logs
    WHERE chat_token = $1
    ORDER BY created_at DESC
    LIMIT 10
  `;
  const historyResult = await client.query(messageHistoryQuery, [memoryToken]);

  // Reverse to get messages in the correct chronological order
  const messages = historyResult.rows.reverse().map(entry => [
    { role: 'user', content: entry.request },
    { role: 'assistant', content: entry.response }
  ]).flat();

  // Append the new message at the end
  messages.push({ role: 'user', content: newMessage });
  
  return messages;
};

// Combined API for starting or continuing a chat
const chatHandler = async (req, res) => {
  const { message, model, memoryToken } = req.body;  
  const userId = req.userId;

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const client = await pool.connect(); // Acquire a client from the pool
  try {
    await client.query('BEGIN'); // Start transaction

    // Fetch user data
    const userQuery = 'SELECT available_tokens, tokens_used, max_tokens FROM users WHERE id = $1';
    const userResult = await client.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      return res.status(404).json({ error: "User not found." });
    }

    const user = userResult.rows[0];
    const maxTokens = user.max_tokens;

    if (user.available_tokens < maxTokens) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      return res.status(403).json({ error: "Insufficient tokens." });
    }

    let messages;
    let isNewChat = false;
    let newMemoryToken = memoryToken;

    if (memoryToken) {
      // Continue an existing chat, fetching last 10 messages
      messages = await buildMessageHistory(memoryToken, message, client);
    } else {
      // Start a new chat
      isNewChat = true;
      newMemoryToken = require('crypto').randomUUID();  // Generates memoryToken
      messages = [{ role: 'user', content: message }];
    }

    // Get AI response
    const { responseText, tokensUsed } = await getAIResponse(messages, model, maxTokens);

    // Save the chat history to the database
    const chatHistoryQuery = `
      INSERT INTO chat_logs (user_id, chat_token, request, response, bot_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;  -- Return the newly created chat_logs id
    `;
    const chatHistoryResult = await client.query(chatHistoryQuery, [userId, newMemoryToken, message, responseText, model]);  
    const chatLogId = chatHistoryResult.rows[0].id;  // Get the new chat log ID

    // Log usage in usage_logs and return its ID
    const logQuery = `
      INSERT INTO usage_logs (user_id, bot_type, request, response, tokens_used)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;  -- Return the newly created usage_logs id
    `;
    const logResult = await client.query(logQuery, [userId, model, message, responseText, tokensUsed]);
    const usageLogId = logResult.rows[0].id;  // Get the new usage log ID

    // Update the chat_logs table to reference the new log_id
    await client.query(`
      UPDATE chat_logs
      SET log_id = $1
      WHERE id = $2
    `, [usageLogId, chatLogId]);

    // Update the user's tokens
    const updateTokensQuery = `
      UPDATE users
      SET tokens_used = tokens_used + $1, available_tokens = available_tokens - $1
      WHERE id = $2
    `;
    await client.query(updateTokensQuery, [tokensUsed, userId]);

    // Update AI tool usage and rewards
    const usageUpdateResult = await updateAiToolUsage(client, userId, model);
    const tokenUsageRes = await updateTokenUsagePoints(userId,client);
    await updateLoginStreak(userId, client);

    await client.query('COMMIT'); // Commit transaction

    // Return the AI response, memoryToken, and both IDs
    return res.status(200).json({
      response: responseText,
      memoryToken: newMemoryToken,  // Return memoryToken instead of chatToken
      log_id: usageLogId,  // ID from usage_logs table
      message_id: chatLogId,   // ID from chat_logs table
      usageUpdate: usageUpdateResult,
      tokenUsage: tokenUsageRes,
      isNewChat
    });
  } catch (error) {
    console.error("Error in chatHandler:", error);
    await client.query('ROLLBACK'); // Rollback transaction on error
    return res.status(500).json({ error: "Failed to process chat." });
  } finally {
    client.release(); // Release the client back to the pool
  }
};

module.exports = {
  chatHandler,
};
