const pool = require('../config/database');

const getAllCancelRequests = async (req, res) => {
    let client;
    try {
        client = await pool.connect();

        // Fetch only the cancel requests where cancelled is false
        const query = 'SELECT * FROM cancel_requests WHERE cancelled = false';
        const result = await client.query(query);

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error in getAllCancelRequests handler:', error);
        return res.status(500).json({ error: 'An error occurred while fetching cancel requests.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// Update a cancel request to set 'cancelled' to true
const updateCancelRequest = async (req, res) => {
    const { id } = req.params;

    let client;
    try {
        client = await pool.connect();

        const updateQuery = `
            UPDATE cancel_requests
            SET cancelled = true
            WHERE id = $1
            RETURNING *;
        `;
        const result = await client.query(updateQuery, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Cancel request not found.' });
        }

        return res.status(200).json({ message: 'Cancel request updated successfully.', request: result.rows[0] });
    } catch (error) {
        console.error('Error updating cancel request:', error);
        return res.status(500).json({ error: 'Failed to update cancel request.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};
const addTokenPromoCode = async (req, res) => {
    const { code, tokens } = req.body;

    // Validate input
    if (!code || !tokens || tokens <= 0) {
        return res.status(400).json({ error: 'Promo code and valid tokens are required.' });
    }

    try {
        const client = await pool.connect();

        try {
            // Insert new promocode data into tokens_promo table
            const insertQuery = `
                INSERT INTO tokens_promo (code, tokens)
                VALUES ($1, $2)
                RETURNING id, code, tokens, used
            `;
            const result = await client.query(insertQuery, [code, tokens]);

            const newPromo = result.rows[0];

            return res.status(201).json({
                message: 'Promo code added successfully.',
                promo: newPromo
            });

        } catch (error) {
            console.error('Error adding promo code:', error);
            return res.status(500).json({ error: 'Server error while adding promo code.' });
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Database connection error:', error);
        return res.status(500).json({ error: 'Server error.' });
    }
};


module.exports = {
    getAllCancelRequests,
    updateCancelRequest,
    addTokenPromoCode
};
