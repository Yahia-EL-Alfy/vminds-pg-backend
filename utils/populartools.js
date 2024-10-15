const pool = require('../config/database');
const cron = require('node-cron');

const updatePopularTools = async () => {
    try {
        const client = await pool.connect();
        await client.query('BEGIN');

        // Clear current popular tools
        await client.query('DELETE FROM popular_tools');

        // Query to get top tools by category, ensuring no duplicates from the same company
        const popularToolsQuery = `
            WITH RankedModels AS (
                SELECT m.id AS model_id, 
                    p.parent_name, 
                    COUNT(l.id) AS usage_count,
                    ROW_NUMBER() OVER (PARTITION BY p.parent_name ORDER BY COUNT(l.id) DESC) AS rank
                FROM ai_models m
                JOIN usage_logs l ON l.bot_type = m.model_string
                JOIN ai_parents p ON p.id = m.parent_id
                WHERE m.available = true
                GROUP BY m.id, p.parent_name
            )
            SELECT model_id, usage_count, parent_name
            FROM RankedModels
            WHERE rank <= 2
            ORDER BY usage_count DESC
            LIMIT 8


        `;
        const { rows: popularTools } = await client.query(popularToolsQuery);

        popularTools.forEach(async (tool, index) => {
            await client.query(
                'INSERT INTO popular_tools (model_id, rank) VALUES ($1, $2)',
                [tool.model_id, index + 1]
            );
        });

        await client.query('COMMIT');
        console.log('Popular tools updated successfully.');
    } catch (error) {
        console.error('Error updating popular tools:', error);
    }
};


cron.schedule(
    '07 20 * * *', 
    () => {
      console.log('Running popular ai tools task...');
      updatePopularTools();
    },
    {
      timezone: 'Africa/Cairo',
    }
  );
