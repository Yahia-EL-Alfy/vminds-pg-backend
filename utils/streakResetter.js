const pool = require('../config/database');
const cron = require('node-cron');

const resetWeeklyStreaks = async () => {
  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `
        SELECT user_id, streak_start_date FROM user_points
        WHERE streak_start_date <= NOW() - INTERVAL '7 days'
      `
      );

      for (const user of rows) {
        await client.query(
          `
          UPDATE user_points
          SET streak_days = 0, streak_start_date = NOW()
          WHERE user_id = $1
        `,
          [user.user_id]
        );

        console.log(`Streak reset for user ID: ${user.user_id}`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error resetting streaks:', error);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
  }
};

cron.schedule(
  '40 16 * * *', 
  () => {
    console.log('Running streak reset task...');
    resetWeeklyStreaks();
  },
  {
    timezone: 'Africa/Cairo',
  }
);
