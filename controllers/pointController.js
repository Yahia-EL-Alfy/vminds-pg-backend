const pool = require('../config/database');

const POINTS_REWARDS = [2, 4, 6, 8, 10, 12]; 

const checkDailyLogin = async (req, res) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        'SELECT * FROM user_points WHERE user_id = $1',
        [userId]
      );

      if (rows.length === 0) {
        const now = new Date();
        const streakDays = 1;
        const points = POINTS_REWARDS[streakDays - 1]; 

        await client.query(
          `INSERT INTO user_points (user_id, points, streak_days, last_prize_date, streak_start_date)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, points, streakDays, now, now]
        );

        await client.query('COMMIT');

        return res.status(200).json({
          message: {
            "points awarded": points,
            "current streak": streakDays
          }
        });
      } else {
        const userPoints = rows[0];
        const lastPrizeDate = new Date(userPoints.last_prize_date);
        const currentDate = new Date();
        const timeDifference = currentDate.getTime() - lastPrizeDate.getTime();
        const hoursDifference = timeDifference / (1000 * 3600);

        if (hoursDifference >= 24) {
          let streakDays = userPoints.streak_days;

          if (streakDays >= POINTS_REWARDS.length) {
            streakDays = 0; 
          }

          streakDays += 1;

          const points = POINTS_REWARDS[streakDays - 1]; 
          const totalPoints = userPoints.points + points;

          await client.query(
            `UPDATE user_points
             SET points = $1, streak_days = $2, last_prize_date = $3
             WHERE user_id = $4`,
            [totalPoints, streakDays, currentDate, userId]
          );

          await client.query('COMMIT');

          return res.status(200).json({
            message: {
              "points awarded": points,
              "current streak": streakDays
            }
          });
        } else {
          return res.status(200).json({
            message: 'No points awarded. Already logged in today.',
          });
        }
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      res.status(500).json({ error: 'Server error' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserPoints = async (req, res) => {
    const { userId } = req.params;
  
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT points FROM user_points WHERE user_id = $1',
          [userId]
        );
  
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found.' });
        }
  
        const { points } = result.rows[0];
        res.status(200).json({ points });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error retrieving user points:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
};

const getUserStreakInfo = async (req, res) => {
    const { userId } = req.params;
  
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT streak_start_date, last_prize_date FROM user_points WHERE user_id = $1',
          [userId]
        );
  
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found.' });
        }
  
        const { streak_start_date, last_prize_date } = result.rows[0];
        res.status(200).json({ streak_start_date, last_prize_date });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error retrieving user streak info:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
};

async function updateLoginStreak(userId) {
  const client = await pool.connect();
  try {
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

      await client.query('COMMIT');
      console.log(`User ${userId}'s login streak updated successfully.`);
  } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating login streak:', error.message);
  } finally {
      client.release();
  }
}


const updateAiToolUsage = async (userId, modelName) => {
  const client = await pool.connect();

  try {
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

      console.log(`Model ${modelName} added for user ID: ${userId}, total AI tools used: ${aiToolsUsed}`);

      // Fetch AI tool usage rewards based on the number of tools used
      const { rows: rewardRows } = await client.query(
        'SELECT points, badge_name FROM rewards WHERE category = $1 AND numbers = $2',
        ['tool', aiToolsUsed]
      );

      if (rewardRows.length > 0) {
        const reward = rewardRows[0];
        const rewardPoints = reward.points;
        const badgeName = reward.badge_name.replace(/ /g, '_').toLowerCase();

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
          const newPoints = userPoints.points + rewardPoints;

          // Update user's points
          await client.query(
            `UPDATE user_points
             SET points = $1
             WHERE user_id = $2`,
            [newPoints, userId]
          );

          // Mark the AI tool reward as claimed
          await client.query(
            `UPDATE used_ai_rewards
             SET ${badgeName} = TRUE
             WHERE user_id = $1`,
            [userId]
          );

          console.log(`Awarded ${rewardPoints} points to user ID: ${userId} for ${aiToolsUsed} AI tools usage`);
        }
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating AI tool usage:', error);
  } finally {
    client.release();
  }
};




const updateTokenUsagePoints = async (userId) => {
  const client = await pool.connect();

  // Get the current month
  const currentMonth = new Date();
  currentMonth.setDate(1); // Set to the first day of the month to standardize

  try {
    await client.query('BEGIN');

    const { rows: userRows } = await client.query(
      'SELECT tokens_used FROM users WHERE id = $1',
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error('User not found');
    }

    const tokensUsed = userRows[0].tokens_used;

    const { rows: pointsRows } = await client.query(
      'SELECT points FROM user_points WHERE user_id = $1',
      [userId]
    );

    if (pointsRows.length === 0) {
      throw new Error('User points not found');
    }

    let points = pointsRows[0].points;

    // Check the token rewards table for this user and month
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
      `SELECT numbers AS threshold, badge_name AS column, points
       FROM rewards
       WHERE category = $1`,
      ['token']
    );

    // Loop through reward categories and update points if criteria met and not already claimed
    for (const reward of rewardCategories) {
      if (tokensUsed >= reward.threshold && !rewardStatus[reward.column]) {
        points += reward.points;

        await client.query(
          `UPDATE token_rewards
           SET ${reward.column} = TRUE
           WHERE user_id = $1 AND reward_month = $2`,
          [userId, currentMonth]
        );

        console.log(`Awarded ${reward.points} points to user ID: ${userId} for spending ${reward.threshold} tokens`);
      }
    }

    await client.query(
      `UPDATE user_points
       SET points = $1
       WHERE user_id = $2`,
      [points, userId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating token usage points:', error);
  } finally {
    client.release();
  }
};


const updateImageCountAndPoints = async (userId) => {
  const client = await pool.connect();

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
      'SELECT points, badge_name FROM rewards WHERE category = $1 AND numbers = $2',
      ['image', number_of_images]
    );

    if (rewardRows.length > 0) {
      // Update the user's points
      points += rewardRows[0].points;

      await client.query(
        `UPDATE user_points
         SET points = $1
         WHERE user_id = $2`,
        [points, userId]
      );

      // Check if the reward is already received
      const { rows: badgeRows } = await client.query(
        'SELECT * FROM image_rewards WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      let badgeData;
      if (badgeRows.length === 0) {
        // If no entry exists, create a new one
        const insertBadgeQuery = `
          INSERT INTO image_rewards (user_id) VALUES ($1) RETURNING *;
        `;
        badgeData = await client.query(insertBadgeQuery, [userId]);
      } else {
        badgeData = badgeRows[0];
      }

      const badgeColumn = rewardRows[0].badge_name.toLowerCase().replace(/\s+/g, '_');
      
      // Check if the badge is already received
      if (!badgeData[badgeColumn]) {
        // Update the image_rewards table to mark the badge as achieved
        const updateBadgeQuery = `
          UPDATE image_rewards 
          SET ${badgeColumn} = TRUE 
          WHERE user_id = $1;
        `;
        await client.query(updateBadgeQuery, [userId]);
        
        console.log(`Awarded ${rewardRows[0].points} points to user ID: ${userId} and achieved badge: ${rewardRows[0].badge_name}`);
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating image count and points:', error);
  } finally {
    client.release();
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
      `UPDATE user_points
       SET number_of_pdf_or_pptx = $1
       WHERE user_id = $2`,
      [number_of_pdf_or_pptx, userId]
    );

    // Fetch reward details based on the updated number of exported documents
    const { rows: rewardRows } = await client.query(
      'SELECT points, badge_name FROM rewards WHERE category = $1 AND numbers = $2',
      ['document', number_of_pdf_or_pptx]
    );

    if (rewardRows.length > 0) {
      // Update the user's points
      points += rewardRows[0].points;

      await client.query(
        `UPDATE user_points
         SET points = $1
         WHERE user_id = $2`,
        [points, userId]
      );

      // Check if the reward is already received
      const { rows: badgeRows } = await client.query(
        'SELECT * FROM export_rewards WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      let badgeData;
      if (badgeRows.length === 0) {
        // If no entry exists, create a new one
        const insertBadgeQuery = `
          INSERT INTO export_rewards (user_id) VALUES ($1) RETURNING *;
        `;
        badgeData = await client.query(insertBadgeQuery, [userId]);
      } else {
        badgeData = badgeRows[0];
      }

      const badgeColumn = rewardRows[0].badge_name.toLowerCase().replace(/\s+/g, '_');

      // Check if the badge is already received
      if (!badgeData[badgeColumn]) {
        // Update the export_rewards table to mark the badge as achieved
        const updateBadgeQuery = `
          UPDATE export_rewards 
          SET ${badgeColumn} = TRUE 
          WHERE user_id = $1;
        `;
        await client.query(updateBadgeQuery, [userId]);
        
        console.log(`Awarded ${rewardRows[0].points} points to user ID: ${userId} and achieved badge: ${rewardRows[0].badge_name}`);
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ message: `Document export count updated for user ID: ${userId}` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating document export count:', error);
    res.status(500).json({ error: 'An error occurred while updating document export count.' });
  } finally {
    client.release();
  }
};

    
    





module.exports = { 
    checkDailyLogin,
    getUserPoints,
    getUserStreakInfo,
    updateLoginStreak,
    updateAiToolUsage,
    updateTokenUsagePoints,
    updateImageCountAndPoints,
    updateDocumentExportCount
  };
