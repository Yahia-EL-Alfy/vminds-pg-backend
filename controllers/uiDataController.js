const pool = require('../config/database');

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
  
      // Helper function to format the badge data into { badgeName, collected, points } format
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
  
            return {
              badgeName,
              collected: value === true,
              points
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
  
      // Combine all badges into a single list with badge name, collected status, and points
      const badges = [
        ...(await formatBadgeData(tokenBadgeRows, tokenBadgeMap)),
        ...(await formatBadgeData(streakBadgeRows, streakBadgeMap)),
        ...(await formatBadgeData(exportBadgeRows, exportBadgeMap)),
        ...(await formatBadgeData(imageBadgeRows, imageBadgeMap)),
        ...(await formatBadgeData(aiBadgeRows, aiBadgeMap))
      ];
  
      await client.query('COMMIT');
  
      // Return the response with all badges, their collected status, and points
      return res.json({ badges });
  
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error fetching user badges:', error);
      return res.status(500).json({ error: 'An error occurred while fetching user badges.' });
    } finally {
      client.release();
    }
  };
  

  
  

module.exports = { getUserGemsAndCredit,getUserDetailsAndAchiv,getUserBadges };
