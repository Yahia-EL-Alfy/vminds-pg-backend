const pool = require('../config/database');
require('dotenv').config();


const getUserGemsAndCredit = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start transaction

    // Fetch both points and available_tokens in a single query using JOIN
    const query = `
      SELECT 
        up.points,
        u.available_tokens
      FROM 
        user_points up
      JOIN 
        users u ON u.id = $1
      WHERE 
        up.user_id = $1;
    `;
    
    const { rows } = await client.query(query, [userId]);

    // Handle user not found scenario
    if (rows.length === 0) {
      await client.query('ROLLBACK'); // Rollback if no data found
      return res.status(404).json({ error: 'User not found.' });
    }

    const userPoints = rows[0].points || 0;
    const availableTokens = Math.floor(rows[0].available_tokens / 1000) || 0;

    await client.query('COMMIT'); // Commit transaction

    return res.json({
      userId,
      Gems: userPoints,
      Credits: availableTokens
    });
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback if an error occurs
    console.error('Error fetching user points and credits:', error);
    res.status(500).json({ error: 'An error occurred while fetching user points and credits.' });
  } finally {
    client.release(); // Ensure the client is released in all cases
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

    // Combine all necessary queries into a single query using JOINs
    const query = `
      SELECT 
        u.tokens_used,
        up.consecutive_days,
        up.streak_days,
        up.points,
        tr.tokens_rookie, tr.tokens_novice, tr.tokens_specialist, tr.tokens_master, tr.tokens_pioneer,
        sr.first_step_login, sr.getting_warmed_up, sr.daily_devotee, sr.routine_regular, sr.steady_supporter, sr.reliable_regular, sr.streak_specialist,
        er.file_rookie, er.content_custodian, er.stellar_organizer, er.cosmic_architect,
        ir.light_seizer, ir.starry_novice, ir.stellar_artist, ir.universe_virtuoso,
        ar.asteroid_explorer, ar.planetary_explorer, ar.galactic_explorer, ar.quasar_explorer, ar.cosmic_explorer
      FROM 
        users u
      JOIN 
        user_points up ON up.user_id = u.id
      LEFT JOIN 
        token_rewards tr ON tr.user_id = u.id
      LEFT JOIN 
        streak_rewards sr ON sr.user_id = u.id
      LEFT JOIN 
        export_rewards er ON er.user_id = u.id
      LEFT JOIN 
        image_rewards ir ON ir.user_id = u.id
      LEFT JOIN 
        used_ai_rewards ar ON ar.user_id = u.id
      WHERE 
        u.id = $1;
    `;

    const { rows } = await client.query(query, [userId]);

    if (rows.length === 0) {
      await client.query('ROLLBACK'); // Rollback if no data found
      return res.status(404).json({ error: 'User not found.' });
    }

    const {
      tokens_used,
      consecutive_days,
      streak_days,
      points,
      ...badges // Spread operator to get all badge-related fields
    } = rows[0];

    // Count true badges
    const countTrueBadges = (badgeData) => {
      return Object.values(badgeData).filter(value => value === true).length;
    };

    const totalBadges = countTrueBadges(badges);

    await client.query('COMMIT'); // Commit transaction

    // Return the response
    return res.json({
      tokensUsed: tokens_used,
      loginStreaks: consecutive_days,
      loginDay: streak_days,
      Gems: points,
      Achievements: totalBadges
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback if an error occurs
    console.error('Error fetching user details and badges:', error);
    return res.status(500).json({ error: 'An error occurred while fetching user details and badges.' });
  } finally {
    client.release(); // Ensure the client is released in all cases
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
  const client = await pool.connect();
  try {
      await client.query('BEGIN'); // Start transaction

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

      await client.query('COMMIT'); // Commit transaction
      return res.status(200).json(toolsWithFullLogoUrl);
  } catch (error) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      console.error('Error fetching popular tools:', error);
      return res.status(500).json({ error: 'Internal server error' });
  } finally {
      client.release(); // Release the client back to the pool
  }
};


const getLastModelUsage = async (req, res) => {
    const userId = req.userId; // Extract user ID directly from the request object

    const client = await pool.connect(); // Acquire a client from the pool
    try {
        await client.query('BEGIN'); // Start transaction

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
            await client.query('ROLLBACK'); // Rollback transaction if no logs found
            client.release(); // Release the client
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

        await client.query('COMMIT'); // Commit transaction
        client.release(); // Release the client

        // Return the most recent log data
        return res.status(200).json(responseData);
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction on error
        console.error("Error fetching recent usage log:", error);
        return res.status(500).json({ error: "Internal server error." });
    } finally {
        client.release(); // Ensure client is released in the finally block
    }
};



const getAlltools = async (req, res) => {
  const client = await pool.connect(); // Acquire a client from the pool
  try {
      await client.query('BEGIN'); // Start transaction

      // SQL query to get category names, company names, model details, and colors
      const query = `
          SELECT 
              c.id AS category_id,
              c.name AS category_name,
              p.id AS parent_id,
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
      const result = companyModels.reduce((acc, { category_id, category_name, parent_id, company_name, model_name, background_color, text_color, logo_url }) => {
          if (!acc[category_name]) {
              acc[category_name] = {
                  category_id, // Store category_id for each category
                  companies: [] // Initialize companies array
              };
          }
          
          // Check if the company is already present in the category
          const companyIndex = acc[category_name].companies.findIndex(item => item.company_name === company_name);
          if (companyIndex === -1) {
              acc[category_name].companies.push({
                  parent_id, // Include parent_id for the company
                  company_name,
                  models: [model_name],
                  background_color,
                  text_color,
                  logo_url
              });
          } else {
              acc[category_name].companies[companyIndex].models.push(model_name);
          }
          return acc;
      }, {});

      // Convert result object to an array
      const formattedResult = Object.keys(result).map(category => ({
          category_id: result[category].category_id,
          category_name: category,
          companies: result[category].companies
      }));

      await client.query('COMMIT'); // Commit transaction
      return res.status(200).json(formattedResult);
  } catch (error) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      console.error('Error fetching categorized company models:', error);
      return res.status(500).json({ error: 'Internal server error' });
  } finally {
      client.release(); // Ensure the client is released
  }
};


const getRecentUsageLogs = async (req, res) => {
  const userId = req.userId;  // Extract user ID directly from the request object

  // Default page size and page number
  const pageSize = 10;
  const pageNumber = parseInt(req.query.page) || 1; // Get the page number from the query params, default to 1

  // Calculate offset
  const offset = (pageNumber - 1) * pageSize;

  const client = await pool.connect(); // Acquire a client from the pool
  try {
      await client.query('BEGIN'); // Start transaction

      // Query to get the last unique chat tokens for the user with pagination
      const chatTokensQuery = `
          SELECT DISTINCT ON (chat_token) chat_token, created_at
          FROM chat_logs
          WHERE user_id = $1
          ORDER BY chat_token, created_at DESC
          LIMIT $2 OFFSET $3; -- Use OFFSET for pagination
      `;
      const chatTokensResult = await client.query(chatTokensQuery, [userId, pageSize, offset]);

      if (chatTokensResult.rows.length === 0) {
          await client.query('COMMIT'); // Commit before responding
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

      await client.query('COMMIT'); // Commit transaction

      // Return the data with the last chat tokens and their respective information
      return res.status(200).json({
          logs,
          hasMore: chatTokensResult.rows.length === pageSize // Checks if there are exactly `pageSize` logs, indicating more data may exist
      });
  } catch (error) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      console.error("Error fetching recent usage logs:", error);
      return res.status(500).json({ error: "Internal server error." });
  } finally {
      client.release(); // Ensure the client is released
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
      SELECT cl.bot_type, cl.request, cl.response, cl.created_at, am.category_id
      FROM chat_logs cl
      JOIN ai_models am ON cl.bot_type = am.model_string  -- Join on model_string
      WHERE cl.chat_token = $1
      ORDER BY cl.created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const chatHistoryResult = await client.query(chatHistoryQuery, [chatToken, pageSize, offset]);

    if (chatHistoryResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ error: "No chat history found for the given token." });
    }

    // Extract category_id from the first result
    const categoryId = chatHistoryResult.rows[0].category_id;

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

    // Return the chat history along with pagination and the categoryId
    return res.status(200).json({
      chatToken,
      chatHistory,
      currentPage: page,
      categoryId,  // Include the single categoryId in the response
      hasMore: totalCount > page * pageSize  // Check if there are more pages available
    });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

const addBookmark = async (req, res) => {
  const userId = req.userId; // Get user ID from the request object
  const { messageId } = req.body; // Get message ID from the request body

  // Validate message ID
  if (!messageId) {
      return res.status(400).json({ error: "Message ID is required." });
  }

  const client = await pool.connect(); // Acquire a client from the pool
  try {
      await client.query('BEGIN'); // Start transaction

      // Check if the bookmark already exists
      const checkBookmarkQuery = `
          SELECT id FROM bookmarks
          WHERE user_id = $1 AND message_id = $2;
      `;
      const existingBookmarkResult = await client.query(checkBookmarkQuery, [userId, messageId]);

      // If the bookmark already exists, return a message
      if (existingBookmarkResult.rows.length > 0) {
          await client.query('COMMIT'); // Commit before responding
          return res.status(200).json({
              message: "Bookmark already exists.",
              bookmarkId: existingBookmarkResult.rows[0].id
          });
      }

      // Insert the new bookmark into the bookmarks table
      const bookmarkQuery = `
          INSERT INTO bookmarks (user_id, message_id)
          VALUES ($1, $2)
          RETURNING id;
      `;
      const bookmarkResult = await client.query(bookmarkQuery, [userId, messageId]);

      if (bookmarkResult.rows.length === 0) {
          throw new Error("Failed to add bookmark."); // Throw an error if insertion fails
      }

      const bookmarkId = bookmarkResult.rows[0].id;

      await client.query('COMMIT'); // Commit transaction

      // Return the newly created bookmark ID
      return res.status(201).json({
          message: "Bookmark added successfully.",
          bookmarkId
      });
  } catch (error) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      console.error("Error adding bookmark:", error);
      return res.status(500).json({ error: "Internal server error." });
  } finally {
      client.release(); // Ensure the client is released
  }
};

const getAllBookmarksForUser = async (req, res) => { 
  const userId = req.userId; // Extract user ID from the request object
  const pageSize = 10; // Number of bookmarks per request
  const page = parseInt(req.query.page) || 1; // Page number from query string, default to 1

  const offset = (page - 1) * pageSize; // Calculate the offset for pagination

  const client = await pool.connect(); // Acquire a client from the pool
  try {
      await client.query('BEGIN'); // Start transaction

      // Fetch the last 10 bookmarks for the user with pagination
      const bookmarksQuery = `
          SELECT id, message_id
          FROM bookmarks
          WHERE user_id = $1
          ORDER BY id DESC
          LIMIT $2 OFFSET $3;
      `;
      const bookmarksResult = await client.query(bookmarksQuery, [userId, pageSize, offset]);

      if (bookmarksResult.rows.length === 0) {
          await client.query('COMMIT'); // Commit before responding
          return res.status(404).json({ error: "No bookmarks found." });
      }

      const messageIds = bookmarksResult.rows.map(row => row.message_id);

      // Fetch details for each message ID in the bookmarks, including chat_token
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
          chat_token: row.chat_token, // Include chat_token in the response
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

      await client.query('COMMIT'); // Commit transaction

      // Return the data with bookmarks and their respective information
      return res.status(200).json({
          logs,
          hasMore: bookmarksResult.rows.length === pageSize // Check if there are exactly `pageSize` bookmarks, indicating more data may exist
      });
  } catch (error) {
      await client.query('ROLLBACK'); // Rollback transaction on error
      console.error("Error fetching bookmarks:", error);
      return res.status(500).json({ error: "Internal server error." });
  } finally {
      client.release(); // Ensure the client is released
  }
};


module.exports = {getAllBookmarksForUser,addBookmark, openChat,getUserGemsAndCredit,getUserDetailsAndAchiv,getUserBadges ,getPopularTools, getLastModelUsage, getAlltools,getRecentUsageLogs,getDailyLoginImages };
