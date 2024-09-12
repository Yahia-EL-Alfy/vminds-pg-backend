const pool = require('../config/database');

// Add Package
const addPackage = async (req, res) => {
    const { name, price, tokens } = req.body;

    if (!name || !price || !tokens) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const client = await pool.connect();
        const query = 'INSERT INTO packages (name, price, tokens) VALUES ($1, $2, $3) RETURNING *';
        const result = await client.query(query, [name, price, tokens]);
        client.release();

        return res.status(201).json({ message: "Package added successfully.", package: result.rows[0] });
    } catch (error) {
        console.error("Error in addPackage:", error);
        return res.status(500).json({ error: "Failed to add package." });
    }
};

// View All Packages
const viewAllPackages = async (req, res) => {
    try {
        const client = await pool.connect();
        const query = 'SELECT * FROM packages';
        const result = await client.query(query);
        client.release();

        return res.status(200).json({ packages: result.rows });
    } catch (error) {
        console.error("Error in viewAllPackages:", error);
        return res.status(500).json({ error: "Failed to retrieve packages." });
    }
};

module.exports = {
    addPackage,
    viewAllPackages
};
