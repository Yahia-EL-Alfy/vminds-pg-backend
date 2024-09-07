// controllers/fetchAiController.js
const pool = require('../config/database');
const { APP_URL } = process.env; 

const getParentByCategory = async (req, res) => {
    try {
      const { category } = req.body;
  
      if (!category) {
        return res.status(400).json({ error: "Category is required" });
      }
  
      const client = await pool.connect();
  
      const query = `
        SELECT p.id, p.logo_url, p.category, p.parent_name
        FROM ai_parents p
        WHERE p.category = $1
        AND EXISTS (
          SELECT 1
          FROM ai_models m
          WHERE m.parent_id = p.id
          AND m.available = TRUE
        );
      `;
  
      const result = await client.query(query, [category]);
      client.release();
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No parents with available models found for this category." });
      }
  
      const parents = result.rows.map(row => ({
        id: row.id,
        name: row.parent_name,
        logo_url: `${APP_URL}${row.logo_url}`, 
        category: row.category
      }));
  
      res.status(200).json(parents);
      
    } catch (error) {
      console.error('Error fetching AI parents by category:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  

const getModelsByParentAndCategory = async (req, res) => {
    try {
      const { parent_id, category } = req.body;
  
      if (!parent_id || !category) {
        return res.status(400).json({ error: "Parent ID and Category are required" });
      }
  
      const client = await pool.connect();
  
      const query = `
        SELECT id, model_name, model_string, category, context_length
        FROM ai_models
        WHERE parent_id = $1 AND category = $2 AND available = TRUE;
      `;
  
      const result = await client.query(query, [parent_id, category]);
      client.release();
  
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "No models found for this parent and category." });
      }
  
      const models = result.rows.map(row => ({
        id: row.id,
        model_name: row.model_name,
        model_string: row.model_string,
        category: row.category,
        context_length: row.context_length
      }));
  
      res.status(200).json(models);
      
    } catch (error) {
      console.error('Error fetching AI models by parent and category:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  
  module.exports = { getParentByCategory, getModelsByParentAndCategory };

