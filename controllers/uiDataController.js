const pool = require('../config/database');
require('dotenv').config();


const getUserGemsAndCredit = async (req, res) => {
    const userId = req.userId;
  
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }
  
    const client = await pool.connect();
    try {
      const { rows: pointsRows } = await client.query(
        'SELECT points FROM user_points WHERE user_id = $1',
        [userId]
      );
  
      const { rows: tokensRows } = await client.query(
        'SELECT available_tokens FROM users WHERE id = $1',
        [userId]
      );
  
      const userPoints = pointsRows.length > 0 ? pointsRows[0].points : 0;
      const availableTokens = tokensRows.length > 0 ? Math.floor(tokensRows[0].available_tokens / 1000) : 0; 
  
      return res.json({
        userId,
        Gems: userPoints,
        Credits: availableTokens 
      });
  
    } catch (error) {
      console.error('Error fetching user points and credits:', error);
      res.status(500).json({ error: 'An error occurred while fetching user points and credits.' });
    } finally {
      client.release();
    }
  };
  

  const getUserDetailsAndAchiv = async (req, res) => {
    const userId = req.userId;
  
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }
  
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
  
      // Fetch tokens_used from users table
      const { rows: userRows } = await client.query(
        'SELECT tokens_used FROM users WHERE id = $1',
        [userId]
      );
      if (userRows.length === 0) {
        return res.status(404).json({ error: 'User not found.' });
      }
      const tokensUsed = userRows[0].tokens_used;
  
      // Fetch consecutive_days, streak_days, and points from user_points table
      const { rows: pointsRows } = await client.query(
        'SELECT consecutive_days, streak_days, points FROM user_points WHERE user_id = $1',
        [userId]
      );
      if (pointsRows.length === 0) {
        return res.status(404).json({ error: 'User points data not found.' });
      }
      const consecutiveDays = pointsRows[0].consecutive_days;
      const streakDays = pointsRows[0].streak_days;
      const points = pointsRows[0].points;
  
      // Fetch badges from rewards tables
      const { rows: tokenBadgeRows } = await client.query(
        'SELECT tokens_rookie, tokens_novice, tokens_specialist, tokens_master, tokens_pioneer FROM token_rewards WHERE user_id = $1',
        [userId]
      );
      const { rows: streakBadgeRows } = await client.query(
        'SELECT first_step_login, getting_warmed_up, daily_devotee, routine_regular, steady_supporter, reliable_regular, streak_specialist FROM streak_rewards WHERE user_id = $1',
        [userId]
      );
      const { rows: exportBadgeRows } = await client.query(
        'SELECT file_rookie, content_custodian, stellar_organizer, cosmic_architect FROM export_rewards WHERE user_id = $1',
        [userId]
      );
      const { rows: imageBadgeRows } = await client.query(
        'SELECT light_seizer, starry_novice, stellar_artist, universe_virtuoso FROM image_rewards WHERE user_id = $1',
        [userId]
      );
      const { rows: aiBadgeRows } = await client.query(
        'SELECT asteroid_explorer, planetary_explorer, galactic_explorer, quasar_explorer, cosmic_explorer FROM used_ai_rewards WHERE user_id = $1',
        [userId]
      );
  
      // Count true badges
      const countTrueBadges = (rows) => {
        return Object.values(rows[0] || {}).filter(value => value === true).length;
      };
  
      const totalBadges =
        countTrueBadges(tokenBadgeRows) +
        countTrueBadges(streakBadgeRows) +
        countTrueBadges(exportBadgeRows) +
        countTrueBadges(imageBadgeRows) +
        countTrueBadges(aiBadgeRows);
  
      await client.query('COMMIT');
  
      // Return the response
      return res.json({
        tokensUsed,
        loginStreaks: consecutiveDays,
        loginDay : streakDays,      
        Gems: points,
        Achievements: totalBadges
      });
  
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error fetching user details and badges:', error);
      return res.status(500).json({ error: 'An error occurred while fetching user details and badges.' });
    } finally {
      client.release();
    }
  };
  

const getUserBadges = async (req, res) => {
      const userId = req.userId;
  
      if (!userId) {
          return res.status(400).json({ error: 'User ID is required.' });
      }
  
      const client = await pool.connect();
      try {
          await client.query('BEGIN');
  
          // Fetch all badges from different reward tables
          const { rows: tokenBadgeRows } = await client.query(
              'SELECT tokens_rookie, tokens_novice, tokens_specialist, tokens_master, tokens_pioneer FROM token_rewards WHERE user_id = $1',
              [userId]
          );
          const { rows: streakBadgeRows } = await client.query(
              'SELECT first_step_login, getting_warmed_up, daily_devotee, routine_regular, steady_supporter, reliable_regular, streak_specialist FROM streak_rewards WHERE user_id = $1',
              [userId]
          );
          const { rows: exportBadgeRows } = await client.query(
              'SELECT file_rookie, content_custodian, stellar_organizer, cosmic_architect FROM export_rewards WHERE user_id = $1',
              [userId]
          );
          const { rows: imageBadgeRows } = await client.query(
              'SELECT light_seizer, starry_novice, stellar_artist, universe_virtuoso FROM image_rewards WHERE user_id = $1',
              [userId]
          );
          const { rows: aiBadgeRows } = await client.query(
              'SELECT asteroid_explorer, planetary_explorer, galactic_explorer, quasar_explorer, cosmic_explorer FROM used_ai_rewards WHERE user_id = $1',
              [userId]
          );
  
          // Helper function to format the badge data into { badgeName, collected, points, logoUrl } format
          const formatBadgeData = async (badgeRows, badgeMap) => {
              if (!badgeRows || badgeRows.length === 0) return [];
  
              return await Promise.all(
                  Object.entries(badgeRows[0]).map(async ([key, value]) => {
                      const badgeName = badgeMap[key];
                      const { rows: rewardRows } = await client.query(
                          'SELECT points FROM rewards WHERE badge_name = $1',
                          [badgeName]
                      );
                      const points = rewardRows.length > 0 ? rewardRows[0].points : 0;
  
                      // Fetch logo URL from image_storage table
                      const { rows: logoRows } = await client.query(
                          'SELECT location FROM image_storage WHERE name = $1',
                          [badgeName]
                      );
                      const logoUrl = logoRows.length > 0 ? `${process.env.APP_URL}${logoRows[0].location}` : null;
  
                      return {
                          badgeName,
                          collected: value === true,
                          points,
                          logoUrl
                      };
                  })
              );
          };
  
          // Badge name mappings
          const tokenBadgeMap = {
              tokens_rookie: 'Tokens Rookie',
              tokens_novice: 'Tokens Novice',
              tokens_specialist: 'Tokens Specialist',
              tokens_master: 'Tokens Master',
              tokens_pioneer: 'Tokens Pioneer'
          };
  
          const streakBadgeMap = {
              first_step_login: 'First Step Login',
              getting_warmed_up: 'Getting Warmed Up',
              daily_devotee: 'Daily Devotee',
              routine_regular: 'Routine Regular',
              steady_supporter: 'Steady Supporter',
              reliable_regular: 'Reliable Regular',
              streak_specialist: 'Streak Specialist'
          };
  
          const exportBadgeMap = {
              file_rookie: 'File Rookie',
              content_custodian: 'Content Custodian',
              stellar_organizer: 'Stellar Organizer',
              cosmic_architect: 'Cosmic Architect'
          };
  
          const imageBadgeMap = {
              light_seizer: 'Light Seizer',
              starry_novice: 'Starry Novice',
              stellar_artist: 'Stellar Artist',
              universe_virtuoso: 'Universe Virtuoso'
          };
  
          const aiBadgeMap = {
              asteroid_explorer: 'Asteroid Explorer',
              planetary_explorer: 'Planetary Explorer',
              galactic_explorer: 'Galactic Explorer',
              quasar_explorer: 'Quasar Explorer',
              cosmic_explorer: 'Cosmic Explorer'
          };
  
          // Combine all badges into a single list with badge name, collected status, points, and logo URL
          const badges = [
              ...(await formatBadgeData(tokenBadgeRows, tokenBadgeMap)),
              ...(await formatBadgeData(streakBadgeRows, streakBadgeMap)),
              ...(await formatBadgeData(exportBadgeRows, exportBadgeMap)),
              ...(await formatBadgeData(imageBadgeRows, imageBadgeMap)),
              ...(await formatBadgeData(aiBadgeRows, aiBadgeMap))
          ];
  
          await client.query('COMMIT');
  
          // Return the response with all badges, their collected status, points, and logo URLs
          return res.json({ badges });
  
      } catch (error) {
          await client.query('ROLLBACK');
          console.error('Error fetching user badges:', error);
          return res.status(500).json({ error: 'An error occurred while fetching user badges.' });
      } finally {
          client.release();
      }
  };
  
  const getDailyLoginImages = async (req, res) => {
    const client = await pool.connect();
    try {
        // Fetch all images from the image_storage table with the category 'daily login'
        const { rows } = await client.query(
            'SELECT code_name, location FROM image_storage WHERE category = $1',
            ['daily login']
        );

        // Format the response as an array with the specified structure
        const response = rows.map(row => {
            return {
                [`${row.code_name.toLowerCase()}image`]: `${process.env.APP_URL}${row.location}`
            };
        });

        // Return the formatted response wrapped in brackets
        return res.json(response);

    } catch (error) {
        console.error('Error fetching daily login images:', error);
        return res.status(500).json({ error: 'An error occurred while fetching daily login images.' });
    } finally {
        client.release();
    }
};

  
const getPopularTools = async (req, res) => {
  try {
    const client = await pool.connect();
    const popularToolsQuery = `
      SELECT pt.rank, m.model_name, p.id AS parent_id, p.parent_name, p.logo_url, 
             m.category_id, p.background_color, p.text_color
      FROM popular_tools pt
      JOIN ai_models m ON m.id = pt.model_id
      JOIN ai_parents p ON p.id = m.parent_id
      ORDER BY pt.rank ASC;
    `;
    const { rows: popularTools } = await client.query(popularToolsQuery);

    // Modify each logo_url to include the base URL from the environment
    const toolsWithFullLogoUrl = popularTools.map(tool => ({
      ...tool,
      logo_url: `${process.env.APP_URL}${tool.logo_url}`
    }));

    return res.status(200).json(toolsWithFullLogoUrl);
  } catch (error) {
    console.error('Error fetching popular tools:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getLastModelUsage = async (req, res) => {
  const userId = req.userId;  // Extract user ID directly from the request object

  try {
      const client = await pool.connect();

      // Query to fetch the most recent log for the user
      const recentLogQuery = `
        SELECT cl.chat_token, cl.request, cl.response, cl.created_at,
               m.model_string, p.parent_name, p.logo_url, p.background_color, p.text_color
        FROM chat_logs cl
        JOIN ai_models m ON cl.bot_type = m.model_string
        JOIN ai_parents p ON m.parent_id = p.id
        WHERE cl.user_id = $1
        ORDER BY cl.created_at DESC
        LIMIT 1;
      `;
      const recentLogResult = await client.query(recentLogQuery, [userId]);

      if (recentLogResult.rows.length === 0) {
          client.release();
          return res.status(404).json({ error: "No chat logs found for this user." });
      }

      const log = recentLogResult.rows[0];

      // Construct the response
      const responseData = {
          chat_token: log.chat_token,
          last_message: log.request,
          last_response: log.response,
          timestamp: log.created_at,
          model: {
              name: log.model_string,
              parent_name: log.parent_name,
              logo: `${process.env.APP_URL}${log.logo_url}`, // Append base URL
              background_color: log.background_color,
              text_color: log.text_color
          }
      };

      client.release();

      // Return the most recent log data
      return res.status(200).json(responseData);
  } catch (error) {
      console.error("Error fetching recent usage log:", error);
      return res.status(500).json({ error: "Internal server error." });
  }
};



const getAlltools = async (req, res) => {
  try {
      const client = await pool.connect();

      // SQL query to get company names, model details, and colors
      const query = `
          SELECT 
              c.name AS category_name,
              p.parent_name AS company_name,
              m.model_name,
              p.background_color,
              p.text_color,
              p.logo_url
          FROM 
              ai_parents p
          JOIN 
              ai_models m ON m.parent_id = p.id
          JOIN 
              categories c ON m.category_id = c.id
          ORDER BY 
              c.name ASC, 
              p.parent_name ASC, 
              m.model_name ASC;
      `;

      const { rows: companyModels } = await client.query(query);
      
      // Group models by category and company
      const result = companyModels.reduce((acc, { category_name, company_name, model_name, background_color, text_color, logo_url }) => {
          if (!acc[category_name]) {
              acc[category_name] = [];
          }
          
          // Check if the company is already present in the category
          const companyIndex = acc[category_name].findIndex(item => item.company_name === company_name);
          if (companyIndex === -1) {
              acc[category_name].push({
                  company_name: company_name,
                  models: [model_name],
                  background_color,
                  text_color,
                  logo_url
              });
          } else {
              acc[category_name][companyIndex].models.push(model_name);
          }
          return acc;
      }, {});

      // Convert result object to an array
      const formattedResult = Object.keys(result).map(category => ({
          category_name: category,
          companies: result[category]
      }));

      return res.status(200).json(formattedResult);
  } catch (error) {
      console.error('Error fetching categorized company models:', error);
      return res.status(500).json({ error: 'Internal server error' });
  } finally {
      client.release();
  }
};

const getRecentUsageLogs = async (req, res) => { 
  const userId = req.userId;  // Extract user ID directly from the request object

  // Default page size (number of logs per request)
  const pageSize = 10;

  try {
    const client = await pool.connect();

    // Query to get the last 10 unique chat tokens for the user
    const chatTokensQuery = `
      SELECT DISTINCT ON (chat_token) chat_token, created_at
      FROM chat_logs
      WHERE user_id = $1
      ORDER BY chat_token, created_at DESC
      LIMIT $2;
    `;
    const chatTokensResult = await client.query(chatTokensQuery, [userId, pageSize]);

    if (chatTokensResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "No chat logs found." });
    }

    const chatTokens = chatTokensResult.rows.map(row => row.chat_token);

    // Query to fetch the last message, response, model logo, model name, and model parent name for each chat token
    const logsQuery = `
      SELECT cl.chat_token, cl.request, cl.response, cl.created_at,
             m.model_string, p.parent_name, p.logo_url, p.background_color, p.text_color
      FROM chat_logs cl
      JOIN ai_models m ON cl.bot_type = m.model_string
      JOIN ai_parents p ON m.parent_id = p.id
      WHERE cl.chat_token = ANY($1)
      AND cl.created_at = (
        SELECT MAX(created_at)
        FROM chat_logs
        WHERE chat_token = cl.chat_token
      )
      ORDER BY cl.created_at DESC;
    `;
    const logsResult = await client.query(logsQuery, [chatTokens]);

    const logs = logsResult.rows.map(row => ({
      chat_token: row.chat_token,
      last_message: row.request,
      last_response: row.response,
      timestamp: row.created_at,
      model: {
        name: row.model_string,
        parent_name: row.parent_name,
        logo: `${process.env.APP_URL}${row.logo_url}`,
        background_color: row.background_color,
        text_color: row.text_color
      }
    }));

    client.release();

    // Return the data with the last 10 chat tokens and their respective information
    return res.status(200).json({
      logs,
      hasMore: logs.length === pageSize // Checks if there are exactly 10 logs, indicating more data may exist
    });
  } catch (error) {
    console.error("Error fetching recent usage logs:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const openChat = async (req, res) => {
  const chatToken = req.query.chatToken;  // Extract chat token from the query parameters
  const page = parseInt(req.query.page) || 1;  // Default to page 1 if not provided
  const pageSize = 10;  // Number of messages per page

  try {
    const client = await pool.connect();

    // Calculate the offset for pagination
    const offset = (page - 1) * pageSize;

    // Query to fetch the last 10 request-response pairs for the given chat token with pagination
    const chatHistoryQuery = `
      SELECT bot_type, request, response, created_at
      FROM chat_logs
      WHERE chat_token = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const chatHistoryResult = await client.query(chatHistoryQuery, [chatToken, pageSize, offset]);

    if (chatHistoryResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "No chat history found for the given token." });
    }

    // Map the result to include the bot_type, request, response, and timestamp
    const chatHistory = chatHistoryResult.rows.map(row => ({
      botType: row.bot_type,  // Map bot_type to botType
      request: row.request,
      response: row.response,
      timestamp: row.created_at
    }));

    // Query to check if more chat logs exist (for pagination)
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM chat_logs
      WHERE chat_token = $1;
    `;
    const countResult = await client.query(countQuery, [chatToken]);
    const totalCount = parseInt(countResult.rows[0].total_count);

    client.release();

    // Return the chat history along with pagination information
    return res.status(200).json({
      chatToken,
      chatHistory,
      currentPage: page,
      hasMore: totalCount > page * pageSize  // Check if there are more pages available
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const addBookmark = async (req, res) => {
  const userId = req.userId;  // Get user ID from the request object
  const { messageId } = req.body;  // Get message ID from the request body

  if (!messageId) {
    return res.status(400).json({ error: "Message ID is required." });
  }

  try {
    const client = await pool.connect();

    // Insert the bookmark into the bookmarks table
    const bookmarkQuery = `
      INSERT INTO bookmarks (user_id, message_id)
      VALUES ($1, $2)
      RETURNING id;
    `;
    const bookmarkResult = await client.query(bookmarkQuery, [userId, messageId]);

    if (bookmarkResult.rows.length === 0) {
      client.release();
      return res.status(500).json({ error: "Failed to add bookmark." });
    }

    const bookmarkId = bookmarkResult.rows[0].id;

    client.release();

    // Return the newly created bookmark ID
    return res.status(201).json({
      message: "Bookmark added successfully.",
      bookmarkId
    });
  } catch (error) {
    console.error("Error adding bookmark:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const getAllBookmarksForUser = async (req, res) => {
  const userId = req.userId;  // Extract user ID directly from the request object
  const pageSize = 10;  // Number of bookmarks per request
  const page = parseInt(req.query.page) || 1;  // Page number from query string, default to 1

  try {
    const client = await pool.connect();

    // Calculate the offset for pagination
    const offset = (page - 1) * pageSize;

    // Query to fetch the last 10 bookmarks for the user
    const bookmarksQuery = `
      SELECT id, message_id
      FROM bookmarks
      WHERE user_id = $1
      ORDER BY id DESC
      LIMIT $2 OFFSET $3;
    `;
    const bookmarksResult = await client.query(bookmarksQuery, [userId, pageSize, offset]);

    if (bookmarksResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "No bookmarks found." });
    }

    // Extract message IDs from bookmarks
    const messageIds = bookmarksResult.rows.map(row => row.message_id);

    // Query to fetch details for each message ID in the bookmarks, including chat_token
    const logsQuery = `
      SELECT cl.chat_token, cl.id AS chat_log_id, cl.request, cl.response, cl.created_at,
             m.model_string, p.parent_name, p.logo_url, p.background_color, p.text_color
      FROM chat_logs cl
      JOIN ai_models m ON cl.bot_type = m.model_string
      JOIN ai_parents p ON m.parent_id = p.id
      WHERE cl.id = ANY($1);
    `;
    const logsResult = await client.query(logsQuery, [messageIds]);

    const logs = logsResult.rows.map(row => ({
      bookmark_id: row.chat_log_id,
      chat_token: row.chat_token,  // Include chat_token in the response
      last_message: row.request,
      last_response: row.response,
      timestamp: row.created_at,
      model: {
        name: row.model_string,
        parent_name: row.parent_name,
        logo: `${process.env.APP_URL}${row.logo_url}`,
        background_color: row.background_color,
        text_color: row.text_color
      }
    }));

    client.release();

    // Return the data with bookmarks and their respective information
    return res.status(200).json({
      logs,
      hasMore: bookmarksResult.rows.length === pageSize // Checks if there are exactly 10 bookmarks, indicating more data may exist
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};;

module.exports = {getAllBookmarksForUser,addBookmark, openChat,getUserGemsAndCredit,getUserDetailsAndAchiv,getUserBadges ,getPopularTools, getLastModelUsage, getAlltools,getRecentUsageLogs,getDailyLoginImages };
