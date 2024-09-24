const pool = require('../config/database');
const cron = require('node-cron');

const resetTokensUsedForAllUsers = async () => {
  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query('UPDATE users SET tokens_used = 0');

      console.log('Tokens used reset to 0 for all users.');

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error resetting tokens used:', error);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
  }
};

cron.schedule(
  '36 16 * * *',
  () => {
    console.log('Running monthly token reset task...');
    resetTokensUsedForAllUsers();
  },
  {
    timezone: 'Africa/Cairo',
  }
);
