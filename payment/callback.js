const pool = require('../config/database');
const { addTokenToUserfunc } = require('../controllers/tokensController');


const callback = async (req, res) => {
    console.log("teeeeeeeeeeest");
    console.log('Request Body:', req.body); // Log the request body to inspect it
    const {
        tran_ref,
        cart_id,
        payment_result,
        customer_details,
        // Add other fields if needed
    } = req.body;

    // Check if payment_result exists
    if (!payment_result) {
        return res.status(400).json({ error: 'Missing payment result data.' });
    }

    const { response_status, response_message } = payment_result;

    // Validate the response_status
    if (response_status !== 'D') {
        return res.status(400).json({ error: 'Payment failed or invalid.', message: response_message });
    }

    let client;
    try {
        client = await pool.connect();

        // Fetch package details
        const packageQuery = 'SELECT * FROM packages WHERE id = $1';
        const packageResult = await client.query(packageQuery, [cart_id]);

        if (packageResult.rows.length === 0) {
            return res.status(404).json({ error: 'Package not found.' });
        }

        const { tokens, id: packageId } = packageResult.rows[0];

        // Fetch user details
        const { email } = customer_details;
        const userQuery = 'SELECT * FROM users WHERE email = $1';
        const userResult = await client.query(userQuery, [email]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const { id: userId } = userResult.rows[0];

        // Add entry to user_packages table
        const insertUserPackageQuery = `
            INSERT INTO user_packages (user_id, package_id)
            VALUES ($1, $2)
        `;
        await client.query(insertUserPackageQuery, [userId, packageId]);

        // Add tokens to user using the correct function
        await addTokenToUserfunc(userId, tokens);

        return res.status(200).json({ message: 'Payment verified and tokens added.' });
    } catch (error) {
        console.error('Error in callback handler:', error);
        return res.status(500).json({ error: 'An error occurred while processing the callback.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = {
    callback
};


