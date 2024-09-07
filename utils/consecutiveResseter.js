const pool = require('../config/database');
const cron = require('node-cron');

const resetStreaksForInactiveUsers = async () => {
  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const currentDate = new Date();

      const { rows } = await client.query(
        `
        SELECT user_id FROM user_points
        WHERE last_used <= $1 - INTERVAL '48 hours'
      `,
        [currentDate]
      );

      for (const user of rows) {
        await client.query(
          `
          UPDATE user_points
          SET consecutive_days = 0, last_used = $1
          WHERE user_id = $2
        `,
          [currentDate, user.user_id]
        );

        console.log(`Consecutive days reset for user ID: ${user.user_id}`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error resetting consecutive days:', error);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
  }
};

cron.schedule(
  '0 0 * * *', 
  () => {
    console.log('Running consecutive days reset task...');
    resetStreaksForInactiveUsers();
  },
  {
    timezone: 'Africa/Cairo',
  }
);
