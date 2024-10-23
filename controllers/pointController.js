const pool = require('../config/database');

const POINTS_REWARDS = [2, 4, 6, 8, 10, 12];
const HOURS_IN_A_DAY = 24; // Constant for hours in a day

const checkDailyLogin = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const client = await pool.connect(); // Acquire the database client
  try {
    await client.query('BEGIN'); // Start the transaction

    const { rows } = await client.query(
      'SELECT * FROM user_points WHERE user_id = $1',
      [userId]
    );

    const now = new Date();
    let points = 0;
    let streakDays = 1; // Default streak day

    if (rows.length === 0) {
      // First login
      points = POINTS_REWARDS[0];
      await client.query(
        `INSERT INTO user_points (user_id, points, streak_days, last_prize_date, streak_start_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, points, streakDays, now, now]
      );
    } else {
      const userPoints = rows[0];
      const lastPrizeDate = new Date(userPoints.last_prize_date);

      // Calculate time difference
      const hoursDifference = (now - lastPrizeDate) / (1000 * 3600);

      if (hoursDifference < HOURS_IN_A_DAY) {
        return res.status(200).json({
          message: 'No points awarded. Already logged in today.',
        });
      }

      // Update streak and points
      streakDays = Math.min(userPoints.streak_days + 1, POINTS_REWARDS.length);
      points = POINTS_REWARDS[streakDays - 1]; // Points based on the new streak

      await client.query(
        `UPDATE user_points
         SET points = points + $1, streak_days = $2, last_prize_date = $3
         WHERE user_id = $4`,
        [points, streakDays, now, userId]
      );
    }

    await client.query('COMMIT'); // Commit the transaction

    return res.status(200).json({
      message: {
        "points awarded": points,
        "current streak": streakDays
      }
    });
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Transaction error:', error);
    return res.status(500).json({ error: 'Server error' });
  } finally {
    client.release(); // Ensure client is released
  }
};

async function updateLoginStreak(userId, client) {
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Check if the user is available in the streak_rewards table
    const streakQuery = `
        SELECT * FROM streak_rewards WHERE user_id = $1 FOR UPDATE;
    `;
    let streakResult = await client.query(streakQuery, [userId]);

    // If user not found, insert a new entry
    if (streakResult.rows.length === 0) {
      const insertStreakQuery = `
          INSERT INTO streak_rewards (user_id) VALUES ($1) RETURNING *;
      `;
      streakResult = await client.query(insertStreakQuery, [userId]);
    }

    const streakData = streakResult.rows[0];

    // Fetch user points and other related data from user_points table
    const pointsQuery = `
        SELECT consecutive_days, last_used FROM user_points WHERE user_id = $1 FOR UPDATE;
    `;
    const pointsResult = await client.query(pointsQuery, [userId]);

    if (pointsResult.rows.length === 0) {
      throw new Error('User not found in user_points table');
    }

    const { consecutive_days, last_used } = pointsResult.rows[0];
    const now = new Date();
    const lastUsed = new Date(last_used);
    const diffInHours = Math.abs(now - lastUsed) / 36e5;

    let updatedConsecutiveDays = consecutive_days;
    let updateLastUsed = false;

    if (diffInHours >= 24) {
      if (diffInHours < 48) {
        // Update last_used and increment consecutive days
        updatedConsecutiveDays += 1;
        updateLastUsed = true;
      } else {
        // Reset consecutive days
        updatedConsecutiveDays = 1;
        updateLastUsed = true;
      }
    }

    // Update the user's consecutive_days and last_used in user_points if needed
    if (updateLastUsed) {
      const updatePointsQuery = `
          UPDATE user_points 
          SET consecutive_days = $1, last_used = NOW()
          WHERE user_id = $2;
      `;
      await client.query(updatePointsQuery, [updatedConsecutiveDays, userId]);
    } else {
      // Update only consecutive_days if last_used is not updated
      const updatePointsQuery = `
          UPDATE user_points 
          SET consecutive_days = $1
          WHERE user_id = $2;
      `;
      await client.query(updatePointsQuery, [updatedConsecutiveDays, userId]);
    }

    // Check if the user reached any reward thresholds
    const rewardsQuery = `
        SELECT points, badge_name 
        FROM rewards 
        WHERE category = 'streak' AND numbers = $1;
    `;
    const rewardsResult = await client.query(rewardsQuery, [updatedConsecutiveDays]);

    if (rewardsResult.rows.length > 0) {
      const { points, badge_name } = rewardsResult.rows[0];
      const badgeColumn = badge_name.toLowerCase().replace(/\s+/g, '_');

      // Check if the reward has already been received
      const rewardReceived = streakData[badgeColumn];
      if (!rewardReceived) {
        // Update user points in user_points table
        const updateUserPointsQuery = `
            UPDATE user_points 
            SET points = points + $1
            WHERE user_id = $2;
        `;
        await client.query(updateUserPointsQuery, [points, userId]);

        // Update the streak_rewards table to mark the badge as achieved
        const updateStreakRewardsQuery = `
            UPDATE streak_rewards 
            SET ${badgeColumn} = TRUE 
            WHERE user_id = $1;
        `;
        await client.query(updateStreakRewardsQuery, [userId]);
      }
    }

    // Commit the transaction
    await client.query('COMMIT');
    console.log(`User ${userId}'s login streak updated successfully.`);
  } catch (error) {
    // Rollback the transaction in case of an error
    await client.query('ROLLBACK');
    console.error('Error updating login streak:', error.message);
    throw new Error('Error updating login streak.');
  }
}


const updateAiToolUsage = async (client, userId, modelName) => {
  try {
    // Start a transaction
    await client.query('BEGIN');

    // Fetch user's current AI tools usage and points
    const { rows: userRows } = await client.query(
      'SELECT ai_tools_used, used_ai_tools, points FROM user_points WHERE user_id = $1',
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error('User not found');
    }

    const userPoints = userRows[0];
    const modelNames = userPoints.used_ai_tools || [];
    let aiToolsUsed = userPoints.ai_tools_used || 0;
    let points = userPoints.points; // Start with current points
    let totalPointsAwarded = 0; // To track the total points awarded in this update
    let badgesWithLogos = []; // Array to store badges and their logos
    let popupFlag = false; // Initialize popup_flag to false

    // If the AI tool hasn't been used before, update the usage
    if (!modelNames.includes(modelName)) {
      modelNames.push(modelName);
      aiToolsUsed += 1;

      await client.query(
        `UPDATE user_points
         SET ai_tools_used = $1, used_ai_tools = array_append(used_ai_tools, $2)
         WHERE user_id = $3`,
        [aiToolsUsed, modelName, userId]
      );

      // Fetch AI tool usage rewards based on the number of tools used
      const { rows: rewardRows } = await client.query(
        'SELECT points, code_name FROM rewards WHERE category = $1 AND numbers = $2',
        ['tool', aiToolsUsed]
      );

      if (rewardRows.length > 0) {
        const reward = rewardRows[0];
        const rewardPoints = reward.points;
        const badgeName = reward.code_name;

        // Fetch current AI rewards status
        const { rows: aiRewardRows } = await client.query(
          'SELECT * FROM used_ai_rewards WHERE user_id = $1',
          [userId]
        );

        let aiRewards = aiRewardRows.length > 0 ? aiRewardRows[0] : null;

        if (!aiRewards) {
          // If no AI rewards exist, initialize them
          await client.query(
            `INSERT INTO used_ai_rewards (user_id)
             VALUES ($1)`,
            [userId]
          );

          aiRewards = {
            asteroid_explorer: false,
            planetary_explorer: false,
            galactic_explorer: false,
            quasar_explorer: false,
            cosmic_explorer: false
          };
        }

        // Check if the user has already been awarded this AI tool reward
        if (!aiRewards[badgeName]) {
          points += rewardPoints;
          totalPointsAwarded += rewardPoints;

          // Update user's points
          await client.query(
            `UPDATE user_points
             SET points = $1
             WHERE user_id = $2`,
            [points, userId]
          );

          // Mark the AI tool reward as claimed
          await client.query(
            `UPDATE used_ai_rewards
             SET ${badgeName} = TRUE
             WHERE user_id = $1`,
            [userId]
          );

          // Fetch the badge logo URL from the image_storage table
          const { rows: badgeRows } = await client.query(
            'SELECT location, name FROM image_storage WHERE code_name = $1',
            [badgeName]
          );

          let badgeLogoUrl = null;
          if (badgeRows.length > 0) {
            badgeLogoUrl = `${process.env.APP_URL}${badgeRows[0].location}`;
          }

          // Use the 'name' column from image_storage as the badge name
          badgesWithLogos.push({
            badge: badgeRows[0]?.name || badgeName, // If badge name is available, use it; otherwise use the badgeName
            logo: badgeLogoUrl,
          });

          // Set popup_flag to true since a new badge is awarded
          popupFlag = true;

          console.log(`Awarded ${rewardPoints} points to user ID: ${userId} for using ${aiToolsUsed} AI tools`);
        }
      }
    } else {
      console.log('AI tool already used.');
    }

    await client.query('COMMIT');

    // Return the response including total points awarded, badge logos, and popup_flag
    return {
      pointsAwarded: totalPointsAwarded,
      badgesAwarded: badgesWithLogos,
      popup_flag: popupFlag
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating AI tool usage:', error);
    throw new Error('Error updating AI tool usage.');
  }
};



const updateTokenUsagePoints = async (userId, client) => {
  // Get the current month
  const currentMonth = new Date();
  currentMonth.setDate(1); // Set to the first day of the month to standardize

  try {
    // Query user data
    const { rows: userRows } = await client.query(
      'SELECT tokens_used FROM users WHERE id = $1',
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error('User not found');
    }

    const tokensUsed = userRows[0].tokens_used;

    // Query user points
    const { rows: pointsRows } = await client.query(
      'SELECT points FROM user_points WHERE user_id = $1',
      [userId]
    );

    if (pointsRows.length === 0) {
      throw new Error('User points not found');
    }

    let points = pointsRows[0].points;

    // Check token rewards for the user in the current month
    const { rows: rewardStatusRows } = await client.query(
      `SELECT *
       FROM token_rewards
       WHERE user_id = $1 AND reward_month = $2`,
      [userId, currentMonth]
    );

    let rewardStatus = rewardStatusRows.length > 0 ? rewardStatusRows[0] : null;

    if (!rewardStatus) {
      // Insert a new row for this month if it doesn't exist
      await client.query(
        `INSERT INTO token_rewards (user_id, reward_month)
         VALUES ($1, $2)`,
        [userId, currentMonth]
      );

      rewardStatus = {
        tokens_rookie: false,
        tokens_novice: false,
        tokens_specialist: false,
        tokens_master: false,
        tokens_pioneer: false,
      };
    }

    // Fetch reward categories from the database
    const { rows: rewardCategories } = await client.query(
      `SELECT numbers AS threshold, code_name AS column, points
       FROM rewards
       WHERE category = $1`,
      ['token']
    );

    // Track awarded points and badges
    let totalPointsAwarded = 0;
    let badgesWithLogos = [];
    let popupFlag = false; // Initialize popup_flag to false

    // Loop through reward categories and update points if criteria met
    for (const reward of rewardCategories) {
      if (tokensUsed >= reward.threshold && !rewardStatus[reward.column]) {
        points += reward.points;
        totalPointsAwarded += reward.points;

        await client.query(
          `UPDATE token_rewards
           SET ${reward.column} = TRUE
           WHERE user_id = $1 AND reward_month = $2`,
          [userId, currentMonth]
        );

        // Fetch badge logo from the image_storage table
        const { rows: badgeRows } = await client.query(
          'SELECT location, name FROM image_storage WHERE code_name = $1',
          [reward.column]
        );

        let badgeLogoUrl = null;
        if (badgeRows.length > 0) {
          badgeLogoUrl = `${process.env.APP_URL}${badgeRows[0].location}`;
        }

        // Add the badge with logo to the response
        badgesWithLogos.push({
          badge: badgeRows[0]?.name || reward.column, // Use the badge name if available
          logo: badgeLogoUrl,
        });

        // Set popup_flag to true since a new badge is awarded
        popupFlag = true;

        console.log(`Awarded ${reward.points} points to user ID: ${userId} for spending ${reward.threshold} tokens`);
      }
    }

    // Update user points
    await client.query(
      `UPDATE user_points
       SET points = $1
       WHERE user_id = $2`,
      [points, userId]
    );

    // Return the response including total points awarded, badge logos, and popup_flag
    return {
      pointsAwarded: totalPointsAwarded,
      badgesAwarded: badgesWithLogos,
      popup_flag: popupFlag,  
    };

  } catch (error) {
    console.error('Error updating token usage points:', error);
    throw new Error('Error updating token usage points.');
  }
};

const updateImageCountAndPoints = async (userId, client) => {
  try {
    await client.query('BEGIN');

    // Fetch the current image count and points for the user
    const { rows: userRows } = await client.query(
      'SELECT number_of_images, points FROM user_points WHERE user_id = $1',
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error('User not found');
    }

    let { number_of_images, points } = userRows[0];
    number_of_images += 1;

    // Update the number of images for the user
    await client.query(
      `UPDATE user_points
       SET number_of_images = $1
       WHERE user_id = $2`,
      [number_of_images, userId]
    );

    // Fetch reward details based on the updated number of images
    const { rows: rewardRows } = await client.query(
      'SELECT points, badge_name, code_name FROM rewards WHERE category = $1 AND numbers = $2',
      ['image', number_of_images]
    );

    let totalPointsAwarded = 0;
    let badgesWithLogos = [];
    let popupFlag = false; // Initialize popup_flag to false

    if (rewardRows.length > 0) {
      // Update the user's points based on the reward
      const awardedPoints = rewardRows[0].points;
      points += awardedPoints;
      totalPointsAwarded += awardedPoints;

      await client.query(
        `UPDATE user_points
         SET points = $1
         WHERE user_id = $2`,
        [points, userId]
      );

      // Check if the user already has the badge for this reward
      const { rows: badgeRows } = await client.query(
        'SELECT * FROM image_rewards WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      let badgeData = badgeRows.length === 0 ? null : badgeRows[0];

      if (!badgeData) {
        // If no badge entry exists, create a new row in image_rewards
        const insertBadgeQuery = `
          INSERT INTO image_rewards (user_id) VALUES ($1) RETURNING *;
        `;
        badgeData = (await client.query(insertBadgeQuery, [userId])).rows[0];
      }

      const badgeColumn = rewardRows[0].code_name;

      if (!badgeData[badgeColumn]) {
        // Update image_rewards table to reflect the badge achievement
        const updateBadgeQuery = `
          UPDATE image_rewards 
          SET ${badgeColumn} = TRUE 
          WHERE user_id = $1;
        `;
        await client.query(updateBadgeQuery, [userId]);

        // Fetch the badge logo URL
        const { rows: badgeLogoRows } = await client.query(
          'SELECT location FROM image_storage WHERE code_name = $1',
          [badgeColumn]
        );

        let badgeLogoUrl = null;
        if (badgeLogoRows.length > 0) {
          badgeLogoUrl = `${process.env.APP_URL}${badgeLogoRows[0].location}`;
        }

        // Add the awarded badge and logo to the response
        badgesWithLogos.push({
          badge: rewardRows[0].badge_name,
          logo: badgeLogoUrl,
        });

        popupFlag = true; // Set popup flag to true if a badge is awarded
      }
    }

    await client.query('COMMIT');

    // Return the response including points awarded, badge logos, and popup_flag
    return {
      pointsAwarded: totalPointsAwarded,
      badgesAwarded: badgesWithLogos,
      popup_flag: popupFlag, // Return popup_flag
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating image count and points:', error);
    throw new Error('Error updating image count and points.');
  }
};

const updateDocumentExportCount = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch the current document export count and points for the user
    const { rows: userRows } = await client.query(
      'SELECT number_of_pdf_or_pptx, points FROM user_points WHERE user_id = $1',
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error('User not found');
    }

    let { number_of_pdf_or_pptx, points } = userRows[0];
    number_of_pdf_or_pptx += 1;

    // Update the number of exported documents for the user
    await client.query(
      'UPDATE user_points SET number_of_pdf_or_pptx = $1 WHERE user_id = $2',
      [number_of_pdf_or_pptx, userId]
    );

    // Fetch reward details based on the updated number of exported documents
    const { rows: rewardRows } = await client.query(
      'SELECT points, badge_name FROM rewards WHERE category = $1 AND numbers = $2',
      ['document', number_of_pdf_or_pptx]
    );

    let totalPointsAwarded = 0;
    let badgesWithLogos = [];
    let popupFlag = false;

    if (rewardRows.length > 0) {
      const awardedPoints = rewardRows[0].points;
      points += awardedPoints;
      totalPointsAwarded += awardedPoints;

      // Update user's points and check for badge award
      await client.query(
        'UPDATE user_points SET points = $1 WHERE user_id = $2',
        [points, userId]
      );

      // Upsert export_rewards for user
      const badgeColumn = rewardRows[0].badge_name.toLowerCase().replace(/\s+/g, '_');
      const { rows: badgeRows } = await client.query(
        'SELECT * FROM export_rewards WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      if (badgeRows.length === 0) {
        await client.query(
          'INSERT INTO export_rewards (user_id, ${badgeColumn}) VALUES ($1, TRUE)',
          [userId]
        );
        popupFlag = true;
      } else {
        const badgeData = badgeRows[0];

        if (!badgeData[badgeColumn]) {
          await client.query(
            'UPDATE export_rewards SET ${badgeColumn} = TRUE WHERE user_id = $1',
            [userId]
          );
          popupFlag = true;
        }
      }

      // Fetch badge logo URL
      const { rows: badgeLogoRows } = await client.query(
        'SELECT location FROM image_storage WHERE name = $1',
        [rewardRows[0].badge_name]
      );

      if (badgeLogoRows.length > 0) {
        badgesWithLogos.push({
          badge: rewardRows[0].badge_name,
          logo: `${process.env.APP_URL}${badgeLogoRows[0].location}`,
        });
      }
    }

    await client.query('COMMIT');

    // Send response with updated points, badge data, and popup flag
    res.status(200).json({
      pointsAwarded: totalPointsAwarded,
      badgesAwarded: badgesWithLogos,
      popup_flag: popupFlag,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating document export count:', error);
    res.status(500).json({ error: 'An error occurred while updating document export count.' });
  } finally {
    client.release();
  }
};


const getUserRanking = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the user's points
    const { rows: userPointsRows } = await client.query(
      'SELECT points FROM user_points WHERE user_id = $1',
      [userId]
    );

    if (userPointsRows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userPoints = userPointsRows[0].points;

    // Get all user points
    const { rows: allPointsRows } = await client.query(
      'SELECT points FROM user_points'
    );

    // Get total number of users
    const totalUsers = allPointsRows.length;

    // Calculate user rank
    const allPoints = allPointsRows.map(row => row.points);
    allPoints.sort((a, b) => b - a); // Sort in descending order

    const userRank = allPoints.indexOf(userPoints) + 1; // Rank starts at 1

    // Calculate the percentage
    let percentage = (userRank / totalUsers) * 100;

    // Adjust the percentage according to your rules
    percentage = Math.round(percentage * 10) / 10; // Round to one decimal place
    percentage = Math.floor(percentage); // Round down to the nearest integer if decimal
    if (percentage === 0 && userRank > 0) {
      percentage = 1; // Set to 1% if the user has a rank but is in the bottom percentage
    }

    await client.query('COMMIT');

    return res.json({
      userRank,
      percentage,
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error calculating user ranking:', error);
    return res.status(500).json({ error: 'An error occurred while calculating user ranking.' });
  } finally {
    client.release();
  }
};


const convertPointsToTokens = async (req, res) => {
  const userId = req.userId; // Extract userId from the request token
  const { pointsToConvert } = req.body; // User inputs how many points they want to convert

  // Check if pointsToConvert is provided and valid
  if (!pointsToConvert || pointsToConvert <= 0) {
    return res.status(400).json({ error: "Please provide a valid number of points to convert." });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start a transaction

    // Fetch the user's current points from user_points table
    const pointsQuery = `SELECT points FROM user_points WHERE user_id = $1;`;
    const pointsResult = await client.query(pointsQuery, [userId]);

    if (pointsResult.rows.length === 0) {
      await client.query('ROLLBACK'); // Rollback if user not found
      return res.status(404).json({ error: "User points not found." });
    }

    const currentPoints = pointsResult.rows[0].points;

    // Check if user has enough points to convert
    if (currentPoints < pointsToConvert) {
      await client.query('ROLLBACK'); // Rollback if insufficient points
      return res.status(400).json({ error: "Insufficient points." });
    }

    // Calculate the tokens from points (divide by 15, truncate decimals, then multiply by 1000)
    const tokensToAdd = Math.trunc(pointsToConvert / 15 * 1000);

    // Deduct points and update available_tokens in users table within the same transaction
    const deductPointsQuery = `
      UPDATE user_points 
      SET points = points - $1 
      WHERE user_id = $2;
    `;
    const updateTokensQuery = `
      UPDATE users 
      SET available_tokens = available_tokens + $1 
      WHERE id = $2;
    `;

    await client.query(deductPointsQuery, [pointsToConvert, userId]);
    await client.query(updateTokensQuery, [tokensToAdd, userId]);

    // Fetch the updated available_tokens from the users table
    const availableTokensQuery = `
      SELECT available_tokens FROM users 
      WHERE id = $1;
    `;
    const availableTokensResult = await client.query(availableTokensQuery, [userId]);
    const availableTokens = availableTokensResult.rows[0].available_tokens;

    await client.query('COMMIT'); // Commit the transaction

    res.status(200).json({
      message: `${(tokensToAdd / 1000).toFixed(1)} credits added`, // Update message format
      tokensAdded: tokensToAdd,
      pointsDeducted: pointsToConvert,
      availableCredits: (availableTokens / 1000).toFixed(1), // Return available credits
    });
  } catch (error) {
    await client.query('ROLLBACK'); // Rollback if an error occurs
    console.error("Error converting points to tokens:", error);
    res.status(500).json({ error: "Internal server error." });
  } finally {
    client.release(); // Ensure the client is released in all cases
  }
};




module.exports = { 
    checkDailyLogin,
    updateLoginStreak,
    updateAiToolUsage,
    updateTokenUsagePoints,
    updateImageCountAndPoints,
    updateDocumentExportCount,
    getUserRanking,
    convertPointsToTokens
  };
