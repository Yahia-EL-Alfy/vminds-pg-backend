const pool = require('../config/database');

// Add Promo Code
const addPromoCode = async (req, res) => {
    const { code, discount, extra_tokens, expiry_date } = req.body;

    if (!code) {
        return res.status(400).json({ error: "Promo code is required." });
    }

    try {
        const client = await pool.connect();
        const query = `
            INSERT INTO promocodes (code, discount, extra_tokens, expiry_date) 
            VALUES ($1, $2, $3, $4) RETURNING *
        `;
        const result = await client.query(query, [code, discount || 0, extra_tokens || 0, expiry_date]);
        client.release();

        return res.status(201).json({ message: "Promo code added successfully.", promocode: result.rows[0] });
    } catch (error) {
        console.error("Error in addPromoCode:", error);
        return res.status(500).json({ error: "Failed to add promo code." });
    }
};

// View All Promo Codes
const viewAllPromoCodes = async (req, res) => {
    try {
        const client = await pool.connect();
        const query = 'SELECT * FROM promocodes';
        const result = await client.query(query);
        client.release();

        return res.status(200).json({ promocodes: result.rows });
    } catch (error) {
        console.error("Error in viewAllPromoCodes:", error);
        return res.status(500).json({ error: "Failed to retrieve promo codes." });
    }
};

module.exports = {
    addPromoCode,
    viewAllPromoCodes
};
