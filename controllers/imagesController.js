const pool = require('../config/database');
const { APP_URL } = process.env;

const getAllbadges = async (req, res) => {
  const client = await pool.connect(); // Move client connection outside the try block for transaction control
  try {
    await client.query('BEGIN'); // Start transaction

    const query = `
      SELECT name, location 
      FROM image_storage;
    `;

    const result = await client.query(query);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK'); // Rollback if no rows are found
      return res.status(404).json({ error: "No daily login images found." });
    }

    const images = {};
    result.rows.forEach(row => {
      const imageName = row.name.split('.')[0]; // Use row.name instead of row.image_name
      const encodedLocation = encodeURIComponent(row.location.split('/').pop()); // Encode the last part of the location (the file name)
      const imageUrl = `${APP_URL}${row.location.replace(row.location.split('/').pop(), encodedLocation)}`; // Replace the file name in the URL with the encoded one
      images[imageName] = imageUrl;
    });

    await client.query('COMMIT'); // Commit transaction if everything is successful
    res.status(200).json(images);

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback in case of an error
    console.error('Error fetching daily login images:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release(); // Always release the client
  }
};

module.exports = { getAllbadges };
