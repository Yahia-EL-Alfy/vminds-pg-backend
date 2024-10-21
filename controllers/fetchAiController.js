const pool = require('../config/database');
const { APP_URL } = process.env; 

const getCategoriesWithImages = async (req, res) => {
  try {
    const client = await pool.connect();

    const query = `
      SELECT id, name, image_url
      FROM categories;
    `;

    const result = await client.query(query);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No categories found." });
    }

    const categories = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      image_url: `${APP_URL}${row.image_url}`, 
    }));

    res.status(200).json(categories);

  } catch (error) {
    console.error('Error fetching categories with images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const getParentByCategory = async (req, res) => {
  try {
    const { category_id } = req.body;

    if (!category_id) {
      return res.status(400).json({ error: "Category ID is required" });
    }

    const client = await pool.connect();

    const query = `
      SELECT p.id, p.logo_url, c.name as category, p.parent_name, p.background_color, p.text_color
      FROM ai_parents p
      JOIN categories c ON p.category_id = c.id
      WHERE c.id = $1
      AND EXISTS (
        SELECT 1
        FROM ai_models m
        WHERE m.parent_id = p.id
        AND m.available = TRUE
      );
    `;

    const result = await client.query(query, [category_id]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No parents with available models found for this category." });
    }

    const parents = result.rows.map(row => ({
      id: row.id,
      name: row.parent_name,
      logo_url: `${APP_URL}${row.logo_url}`,
      category: row.category,
      background_color: row.background_color,
      text_color: row.text_color
    }));

    res.status(200).json(parents);

  } catch (error) {
    console.error('Error fetching AI parents by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


  
const getModelsByParentAndCategory = async (req, res) => {
  try {
    const { parent_id, category_id } = req.body;

    // Check for missing input
    if (!parent_id || !category_id) {
      console.error('Validation Error: Missing parent_id or category_id');
      return res.status(400).json({ error: "Parent ID and Category ID are required" });
    }

    const client = await pool.connect();

    const query = `
      SELECT m.id, m.model_name, m.model_string, c.name as category, m.context_length, p.parent_name
      FROM ai_models m
      JOIN categories c ON m.category_id = c.id
      JOIN ai_parents p ON m.parent_id = p.id
      WHERE m.parent_id = $1 AND c.id = $2 AND m.available = TRUE;
    `;

    const result = await client.query(query, [parent_id, category_id]);
    client.release();

    // Check if no models were found
    if (result.rows.length === 0) {
      console.error(`No models found for parent_id: ${parent_id}, category_id: ${category_id}`);
      return res.status(404).json({ error: "No models found for this parent and category." });
    }

    const models = result.rows.map(row => ({
      id: row.id,
      model_name: row.model_name,
      model_string: row.model_string,
      category: row.category,
      parent_name: row.parent_name
    }));

    // Send the result
    res.status(200).json(models);

  } catch (error) {
    // Log detailed error information
    console.error('Error fetching AI models by parent and category:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
      table: error.table,
      constraint: error.constraint,
      hint: error.hint
    });

    // Send detailed error response
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: error.code || null,       // Optional, in case it's a DB error
      hint: error.hint || null,       // Optional, additional details if available
      stack: error.stack              // Optional, stack trace for debugging
    });
  }
};


  
  module.exports = { getParentByCategory, getModelsByParentAndCategory,getCategoriesWithImages };

