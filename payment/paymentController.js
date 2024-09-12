const pool = require('../config/database');
const PayTabs = require('paytabs_pt2');

// PayTabs configuration
const profileID = "112942";
const serverKey = "S6JNJKLH9W-JJTWRHKKLD-W2NNT6DKZJ";
const region = "SAU";
PayTabs.setConfig(profileID, serverKey, region);

let paymentMethods = ["creditcard, valu, applepay"];

// Make purchase function
const makePurchase = async (req, res) => {
    const userId = req.userId; // Extracted from token middleware
    const { packageId, promoCode } = req.body;
    let client;

    try {
        client = await pool.connect();

        // Fetch package details
        const packageQuery = 'SELECT * FROM packages WHERE id = $1';
        const packageResult = await client.query(packageQuery, [packageId]);

        if (packageResult.rows.length === 0) {
            return res.status(404).json({ error: "Package not found." });
        }

        let { price, tokens } = packageResult.rows[0];
        let strPrice=price.toString();

        // If promo code is applied, validate and adjust the price/tokens
        if (promoCode) {
            const promoQuery = 'SELECT * FROM promocodes WHERE code = $1';
            const promoResult = await client.query(promoQuery, [promoCode]);

            if (promoResult.rows.length === 0) {
                return res.status(400).json({ error: "Invalid promo code." });
            }

            const { discount_percentage, extra_tokens } = promoResult.rows[0];
            price = price - (price * discount_percentage / 100);
            tokens += extra_tokens;
        }

        // Fetch user details
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);
        const user = userResult.rows[0];

        const customer_details = [
            user.first_name + ' ' + user.last_name,
            user.email,
            user.phone || '', // Fallback if phone is not available
            user.street || 'Street not provided',
            user.city || 'City not provided',
            user.state || 'State not provided',
            user.country || 'Country not provided',
            user.zip || 'Zip not provided',
            'IP' // Placeholder for user IP
        ];

        const cart = {
            id: packageId.toString(),
            currency: "SAR",
            amount: strPrice,
            description: `Purchase of package ${packageId}`
        };

        // PayTabs payment initiation
        PayTabs.createPaymentPage(
            paymentMethods,
            ['sale', 'ecom'],
            [cart.id, cart.currency, cart.amount, cart.description],
            customer_details,
            customer_details, // Using customer details as shipping
            ['https://backend.vminds.ai/api/vminds/call/call-back', 'https://backend.vminds.ai/api/vminds/call/call-back'], // These URLs should point to your application
            'en',
            (paymentResponse) => {
                if (paymentResponse && paymentResponse.redirect_url) {
                    return res.status(200).json({ redirect_url: paymentResponse.redirect_url });
                } else {
                    return res.status(400).json({ error: "Payment initiation failed.", details: paymentResponse });
                }
            },
            false
        );
    } catch (error) {
        console.error('Error in makePurchase:', error);
        return res.status(500).json({ error: 'An error occurred during the purchase.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = {
    makePurchase,
};
