const pool = require('../config/database');
const { APP_URL } = process.env;

const getAllbadges = async (req, res) => {
  try {
    const client = await pool.connect();
    const query = `
      SELECT name, location 
      FROM image_storage;
    `;

    const result = await client.query(query);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No daily login images found." });
    }

    const images = {};
    result.rows.forEach(row => {
      const imageName = row.name.split('.')[0]; // Corrected: use row.name instead of row.image_name
      const encodedLocation = encodeURIComponent(row.location.split('/').pop()); // Encode the last part of the location (the file name)
      const imageUrl = `${APP_URL}${row.location.replace(row.location.split('/').pop(), encodedLocation)}`; // Replace the file name in the URL with the encoded one
      images[imageName] = imageUrl;
    });

    res.status(200).json(images);

  } catch (error) {
    console.error('Error fetching daily login images:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


module.exports = { getAllbadges };
