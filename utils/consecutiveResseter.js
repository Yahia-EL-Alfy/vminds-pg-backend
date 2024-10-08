const pool = require('../config/database');
const cron = require('node-cron');

const resetStreaksForInactiveUsers = async () => {
  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const currentDate = new Date();
      const pastDate = new Date(currentDate.getTime() - 48 * 60 * 60 * 1000); 

      const { rows } = await client.query(
        `
        SELECT user_id FROM user_points
        WHERE last_used <= $1
      `,
        [pastDate]
      );

      for (const user of rows) {
        await client.query(
          `
          UPDATE user_points
          SET consecutive_days = 1, last_used = $1
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
  '32 16 * * *', // Run at 4 PM every day
  () => {
    console.log('Running consecutive days reset task...');
    resetStreaksForInactiveUsers();
  },
  {
    timezone: 'Africa/Cairo',
  }
);
