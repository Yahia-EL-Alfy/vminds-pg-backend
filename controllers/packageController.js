const pool = require('../config/database');

// Add Package
const addPackage = async (req, res) => {
    const { name, price, tokens } = req.body;

    if (!name || !price || !tokens) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const client = await pool.connect(); // Move client connection outside the try block for transaction control
    try {
        await client.query('BEGIN'); // Start transaction

        const query = 'INSERT INTO packages (name, price, tokens) VALUES ($1, $2, $3) RETURNING *';
        const result = await client.query(query, [name, price, tokens]);

        await client.query('COMMIT'); // Commit transaction if everything is successful
        return res.status(201).json({ message: "Package added successfully.", package: result.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback in case of an error
        console.error("Error in addPackage:", error);
        return res.status(500).json({ error: "Failed to add package." });
    } finally {
        client.release(); // Always release the client
    }
};

// View All Packages
const viewAllPackages = async (req, res) => {
    const client = await pool.connect(); // Move client connection outside the try block for transaction control
    try {
        await client.query('BEGIN'); // Start transaction

        const query = 'SELECT * FROM packages';
        const result = await client.query(query);

        await client.query('COMMIT'); // Commit transaction if everything is successful
        return res.status(200).json({ packages: result.rows });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback in case of an error
        console.error("Error in viewAllPackages:", error);
        return res.status(500).json({ error: "Failed to retrieve packages." });
    } finally {
        client.release(); // Always release the client
    }
};

module.exports = {
    addPackage,
    viewAllPackages
};
