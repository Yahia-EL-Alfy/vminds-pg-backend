const pool = require('../config/database');
const { addTokenToUserfunc } = require('./tokensController');

// Add Promo Code
const addPromoCode = async (req, res) => {
    const { code, discount, extra_tokens, expiry_date } = req.body;

    if (!code) {
        return res.status(400).json({ error: "Promo code is required." });
    }

    const client = await pool.connect(); // Get client outside the try-catch
    try {
        await client.query('BEGIN'); // Begin transaction

        const query = `
            INSERT INTO promocodes (code, discount, extra_tokens, expiry_date) 
            VALUES ($1, $2, $3, $4) RETURNING *
        `;
        const result = await client.query(query, [code, discount || 0, extra_tokens || 0, expiry_date]);
        
        await client.query('COMMIT'); // Commit transaction
        return res.status(201).json({ message: "Promo code added successfully.", promocode: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error("Error in addPromoCode:", error);
        return res.status(500).json({ error: "Failed to add promo code." });
    } finally {
        client.release(); // Ensure client is released
    }
};

// View All Promo Codes
const viewAllPromoCodes = async (req, res) => {
    const client = await pool.connect(); // Get client outside the try-catch
    try {
        const query = 'SELECT * FROM promocodes';
        const result = await client.query(query);
        return res.status(200).json({ promocodes: result.rows });
    } catch (error) {
        console.error("Error in viewAllPromoCodes:", error);
        return res.status(500).json({ error: "Failed to retrieve promo codes." });
    } finally {
        client.release(); // Ensure client is released
    }
};

// Apply Tokens Promo Code
const applyTokensPromoCode = async (req, res) => {
    const userId = req.userId; // Extract user ID from the request
    const { promocode } = req.body;

    // Validate that a promo code is provided
    if (!promocode) {
        return res.status(400).json({ error: "Promo code is required." });
    }

    const client = await pool.connect(); // Get client outside the try-catch
    try {
        await client.query('BEGIN'); // Begin transaction

        // Check if the promo code exists and is valid
        const promoResult = await client.query(
            'SELECT * FROM tokens_promo WHERE code = $1',
            [promocode]
        );

        // Check if promo code exists
        if (promoResult.rows.length === 0) {
            await client.query('ROLLBACK'); // Rollback transaction
            return res.status(400).json({ error: 'Invalid promo code.' });
        }

        const promo = promoResult.rows[0];

        // Check if promo code has already been used
        if (promo.used) {
            await client.query('ROLLBACK'); // Rollback transaction
            return res.status(400).json({ error: 'Promo code has already been used.' });
        }

        const { tokens, id: promoId } = promo;

        // Add tokens to the user account using the addTokenToUserfunc
        const addTokenResult = await addTokenToUserfunc(userId, tokens);

        // Mark the promo code as used by this user
        await client.query(
            'UPDATE tokens_promo SET used = true, used_by = $1 WHERE id = $2',
            [userId, promoId]
        );

        await client.query('COMMIT'); // Commit transaction

        return res.status(200).json({
            message: 'Promo code applied successfully.',
            tokensAdded: tokens,
            newTokenBalance: addTokenResult.message
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback on error
        console.error('Transaction error:', error);
        return res.status(500).json({ error: 'Server error' });
    } finally {
        client.release(); // Ensure client is released
    }
};

module.exports = {
    addPromoCode,
    viewAllPromoCodes,
    applyTokensPromoCode
};
