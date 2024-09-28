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
      `SELECT numbers AS threshold, code_name AS column, points
       FROM rewards
       WHERE category = $1`,
      ['token']
    );

    // Prepare a response to track awarded points and badges
    let totalPointsAwarded = 0;
    let badgesWithLogos = [];
    let popupFlag = false; // Initialize popup_flag to false

    // Loop through reward categories and update points if criteria met and not already claimed
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

        // Compare the reward column with code_name in image_storage table
        const { rows: badgeRows } = await client.query(
          'SELECT location, name FROM image_storage WHERE code_name = $1',
          [reward.column]
        );

        let badgeLogoUrl = null;
        if (badgeRows.length > 0) {
          badgeLogoUrl = `${process.env.APP_URL}${badgeRows[0].location}`;
        }

        // Use the 'name' column from image_storage as the badge name
        badgesWithLogos.push({
          badge: badgeRows[0]?.name || reward.column, // If badge name is available, use it; otherwise use the reward.column
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

    await client.query('COMMIT');

    // Return the response including total points awarded, badge logos, and popup_flag
    return {
      pointsAwarded: totalPointsAwarded,
      badgesAwarded: badgesWithLogos,
      popup_flag: popupFlag,  
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating token usage points:', error);
    throw new Error('Error updating token usage points.');
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
        console.log("haaaaaaaaaaaaaaa" + badgeColumn );
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

    let totalPointsAwarded = 0;
    let badgesWithLogos = [];
    let popupFlag = false; // Initialize popup_flag to false

    if (rewardRows.length > 0) {
      // Update the user's points
      const awardedPoints = rewardRows[0].points;
      points += awardedPoints;
      totalPointsAwarded += awardedPoints;

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

        // Fetch the badge logo URL
        const { rows: badgeLogoRows } = await client.query(
          'SELECT location FROM image_storage WHERE name = $1',
          [rewardRows[0].badge_name]
        );

        let badgeLogoUrl = null;
        if (badgeLogoRows.length > 0) {
          badgeLogoUrl = `${process.env.APP_URL}${badgeLogoRows[0].location}`;
        }

        badgesWithLogos.push({
          badge: rewardRows[0].badge_name,
          logo: badgeLogoUrl,
        });

        console.log(`Awarded ${awardedPoints} points to user ID: ${userId} and achieved badge: ${rewardRows[0].badge_name}`);

        // Set popup_flag to true since a new badge is awarded
        popupFlag = true;
      }
    }

    await client.query('COMMIT');

    // Send response with updated points, badge data, and popup flag
    res.status(200).json({
      pointsAwarded: totalPointsAwarded,
      badgesAwarded: badgesWithLogos, // Return badge name and logo if awarded
      popup_flag: popupFlag,           // Return popup_flag
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

    const { rows: userPointsRows } = await client.query(
      'SELECT points FROM user_points WHERE user_id = $1',
      [userId]
    );
    if (userPointsRows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const userPoints = userPointsRows[0].points;

    const { rows: allPointsRows } = await client.query(
      'SELECT points FROM user_points'
    );

    const allPoints = allPointsRows.map(row => row.points);

    allPoints.sort((a, b) => b - a);

    const userRank = allPoints.indexOf(userPoints) + 1;
    const totalUsers = allPoints.length;

    const percentile = (userRank / totalUsers) * 100;

    const roundedPercentile = Math.ceil(percentile);

    await client.query('COMMIT');

    return res.json({percentage: roundedPercentile});

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error calculating user ranking:', error);
    return res.status(500).json({ error: 'An error occurred while calculating user ranking.' });
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
    updateDocumentExportCount,
    getUserRanking
  };
