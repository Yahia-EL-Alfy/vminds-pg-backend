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



// const STREAK_MILESTONES = [
//   { days: 3, points: 10, name: 'First Step' },
//   { days: 5, points: 30, name: 'Getting Warmed Up' },
//   { days: 7, points: 70, name: 'Daily Devotee' },
//   { days: 14, points: 150, name: 'Routine Regular' },
//   { days: 30, points: 500, name: 'Steady Supporter' },
//   { days: 45, points: 1000, name: 'Reliable Regular' },
//   { days: 60, points: 2000, name: 'Streak Specialist' }
// ];

// const checkDailyLoginAndStreaks = async (req, res) => {
//   const { userId } = req.body;

//   if (!userId) {
//     return res.status(400).send('User ID is required.');
//   }

//   try {
//     const client = await pool.connect();

//     try {
//       await client.query('BEGIN');

//       const { rows } = await client.query(
//         'SELECT * FROM user_points WHERE user_id = $1',
//         [userId]
//       );

//       const currentDate = new Date();

//       if (rows.length === 0) {
//         const streakDays = 1;
//         const points = POINTS_REWARDS[streakDays - 1]; 

//         await client.query(
//           `INSERT INTO user_points (user_id, points, streak_days, last_prize_date, streak_start_date)
//            VALUES ($1, $2, $3, $4, $5)`,
//           [userId, points, streakDays, currentDate, currentDate]
//         );

//         await client.query('COMMIT');

//         return res.status(200).json({
//           message: `Points awarded: ${points}. Current streak: ${streakDays}`,
//         });
//       } else {
//         const userPoints = rows[0];
//         const lastPrizeDate = new Date(userPoints.last_prize_date);
//         const timeDifference = currentDate.getTime() - lastPrizeDate.getTime();
//         const hoursDifference = timeDifference / (1000 * 3600);

//         if (hoursDifference >= 24) {
//           let streakDays = userPoints.streak_days + 1;
//           const points = POINTS_REWARDS[streakDays - 1] || 0;
//           const totalPoints = userPoints.points + points;

//           await client.query(
//             `UPDATE user_points
//              SET points = $1, streak_days = $2, last_prize_date = $3
//              WHERE user_id = $4`,
//             [totalPoints, streakDays, currentDate, userId]
//           );

//           for (const milestone of STREAK_MILESTONES) {
//             if (streakDays === milestone.days) {
//               const { rowCount } = await client.query(
//                 `SELECT * FROM user_milestones 
//                  WHERE user_id = $1 AND milestone_name = $2`,
//                 [userId, milestone.name]
//               );

//               if (rowCount === 0) {
//                 await client.query(
//                   `INSERT INTO user_milestones (user_id, milestone_name)
//                    VALUES ($1, $2)`,
//                   [userId, milestone.name]
//                 );

//                 const milestonePoints = totalPoints + milestone.points;

//                 await client.query(
//                   `UPDATE user_points
//                    SET points = $1
//                    WHERE user_id = $2`,
//                   [milestonePoints, userId]
//                 );

//                 await client.query('COMMIT');

//                 return res.status(200).json({
//                   message: `Milestone achieved: ${milestone.name}. Additional points awarded: ${milestone.points}. Total points: ${milestonePoints}`,
//                 });
//               }
//             }
//           }

//           await client.query('COMMIT');

//           return res.status(200).json({
//             message: `Points awarded: ${points}. Current streak: ${streakDays}`,
//           });
//         } else {
//           return res.status(200).json({
//             message: 'No points awarded. Already logged in today.',
//           });
//         }
//       }
//     } catch (error) {
//       await client.query('ROLLBACK');
//       console.error('Transaction error:', error);
//       res.status(500).send('Server error');
//     } finally {
//       client.release();
//     }
//   } catch (error) {
//     console.error('Database connection error:', error);
//     res.status(500).send('Server error');
//   }
// };


module.exports = { 
    checkDailyLogin,
    getUserPoints,
    getUserStreakInfo,
    // checkDailyLoginAndStreaks
};
