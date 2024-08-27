// controllers/imagesController.js
const pool = require('../config/database');
const { APP_URL } = process.env;

const getAllDailyLoginImages = async (req, res) => {
  try {
    const client = await pool.connect();
    const query = `
      SELECT image_name, location 
      FROM image_storage 
      WHERE category = 'daily login';
    `;

    const result = await client.query(query);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No daily login images found." });
    }

    const images = {};
    result.rows.forEach(row => {
      const imageName = row.image_name.split('.')[0]; 
      const imageUrl = `${APP_URL}${row.location}`;
      images[imageName] = imageUrl;
    });

    res.status(200).json(images);

  } catch (error) {
    console.error('Error fetching daily login images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getAllDailyLoginImages };
