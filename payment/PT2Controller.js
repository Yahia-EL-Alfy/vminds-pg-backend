const pool = require('../config/database');
const axios = require('axios');

require('dotenv').config();

const profileID = process.env.PAYTABS_PROFILE_ID;
const serverKey = process.env.PAYTABS_SERVER_KEY;
const paytabsUrl = `https://secure.PayTabs.sa/payment/request`;

const makePurchase = async (req, res) => {
    const userId = req.userId;
    const { packageId, promoCode } = req.body;
    let client;
    const callbackURL = process.env.CALLBACK_URL;
    const returnURL = process.env.RETURN_URL;

    try {
        client = await pool.connect();

        // Fetch package data
        const packageQuery = 'SELECT * FROM packages WHERE id = $1';
        const packageResult = await client.query(packageQuery, [packageId]);

        if (packageResult.rows.length === 0) {
            return res.status(404).json({ error: "Package not found." });
        }

        let { price, tokens } = packageResult.rows[0];
        price = parseFloat(price);

        // Handle promo code
        let promoCodeId = null;
        if (promoCode) {
            const promoQuery = 'SELECT * FROM promocodes WHERE code = $1 AND expiry_date > NOW()';
            const promoResult = await client.query(promoQuery, [promoCode]);

            if (promoResult.rows.length === 0) {
                return res.status(400).json({ error: "Invalid or expired promo code." });
            }

            const { id: promoId, discount, extra_tokens } = promoResult.rows[0];
            promoCodeId = promoId;

            if (discount) {
                price = price - (price * parseFloat(discount) / 100);
            } else if (extra_tokens) {
                tokens += extra_tokens;
            }

            if (isNaN(price)) {
                return res.status(400).json({ error: "Invalid adjusted price after applying promo code." });
            }
        }

        // Fetch user data
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // Customer details
        const customer_details = {
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phone: user.phone || '',
            street1: user.street || 'Street not provided',
            city: user.city || 'City not provided',
            country: user.country || 'Algeria',
            zip: user.zip || '11728',
        };

        // Cart details (using the packageId directly as the cart id)
        const cart = {
            id: packageId.toString(),  // Using packageId as cart ID
            currency: "SAR",
            amount: price.toFixed(2),
            description: `Purchase of package ${packageId}`
        };
        const strID = userId.toString();
        // Invoice request with notification
        const response = await axios.post(paytabsUrl, {
            profile_id: process.env.PAYTABS_PROFILE_ID, 
            payment_methods: ["creditcard", "stcpay", "applepay", "mada"],
            tran_type: "sale",
            tran_class: "ecom",
            cart_id: cart.id,
            cart_currency: cart.currency,
            cart_amount: cart.amount,
            cart_description: cart.description,
            hide_shipping: true,
            return: returnURL,
            callback: callbackURL,
            customer_details: customer_details,
            user_defined: {
                udf1: 'Additional info 1',
                udf2: 'Additional info 2',
                udf3: strID,
                udf4: tokens,
            },
            invoice: {
                shipping_charges: 0,
                extra_charges: 0,
                extra_discount: 0,
                total: price.toFixed(2),
                notifications: {
                    emails: ["yahiawalid95@gmail.com"]
                },
                line_items: [
                    {
                        sku: "sku",
                        description: "Test Description",
                        unit_cost: price.toFixed(2),
                        quantity: 1,
                        net_total: price.toFixed(2),
                        total: price.toFixed(2)
                    }
                ]
            }
        }, {
            headers: {
                'Authorization': serverKey,  
                'Content-Type': 'application/json'  
            }
        });

        // Handle response
        if (response.data && response.data.redirect_url) {
            return res.status(200).json({ redirect_url: response.data.redirect_url });
        } else {
            return res.status(400).json({ error: "Payment initiation failed.", details: response.data });
        }

    } catch (error) {
        console.error('Error in makePurchase:', error);
        return res.status(500).json({ error: 'An error occurred during the purchase.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};


const recurringPurchase = async (req, res) => {
    const userId = req.userId; // Use the authenticated user ID
    const { packageId, promoCode } = req.body;
    let client;
    const callbackURL = process.env.CALLBACK_URL;
    const returnURL = process.env.RETURN_URL;

    try {
        client = await pool.connect();

        // Fetch package data
        const packageQuery = 'SELECT * FROM packages WHERE id = $1';
        const packageResult = await client.query(packageQuery, [packageId]);

        if (packageResult.rows.length === 0) {
            return res.status(404).json({ error: "Package not found." });
        }

        let { price, tokens } = packageResult.rows[0];
        const originalPrice = parseFloat(price);  
        price = parseFloat(price);

        // Handle promo code
        let promoCodeId = null;
        if (promoCode) {
            const promoQuery = 'SELECT * FROM promocodes WHERE code = $1 AND expiry_date > NOW()';
            const promoResult = await client.query(promoQuery, [promoCode]);

            if (promoResult.rows.length === 0) {
                return res.status(400).json({ error: "Invalid or expired promo code." });
            }

            const { id: promoId, discount, extra_tokens } = promoResult.rows[0];
            promoCodeId = promoId;

            if (discount) {
                price = price - (price * parseFloat(discount) / 100);
                price = parseFloat(price.toFixed(2));
            } else if (extra_tokens) {
                tokens += extra_tokens;
            }

            if (isNaN(price)) {
                return res.status(400).json({ error: "Invalid adjusted price after applying promo code." });
            }
        }
        // Fetch user data
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        // Customer details
        const customer_details = {
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phone: user.phone || '',
            street1: user.street || 'Street not provided',
            city: user.city || 'City not provided',
            country: user.country || 'Algeria',
            zip: user.zip || '11728',
        };
        // Cart details
        const cart = {
            id: packageId.toString(),  
            currency: "SAR",
            amount: price,  
            description: `Purchase of package ${packageId}`
        };
        console.log(price);
        const strID = userId.toString();
        // Invoice request with recurring payment agreement
        const response = await axios.post(paytabsUrl, {
            profile_id: process.env.PAYTABS_PROFILE_ID,
            payment_methods: ["creditcard", "stcpay", "applepay" , "mada"],
            tran_type: "sale",
            tran_class: "ecom",
            cart_id: cart.id,
            cart_currency: cart.currency,
            cart_amount: cart.amount,  
            cart_description: cart.description,
            hide_shipping: true,
            return: returnURL,
            callback: callbackURL,
            customer_details: customer_details,
            agreement: {
                agreement_description: "Monthly recurring payment agreement",
                agreement_currency: "SAR",
                initial_amount: price,  
                repeat_amount: originalPrice,  
                repeat_terms: 2, 
                repeat_period: 1,   
                repeat_every: 2,    
                first_installment_due_date: "02/OCT/2024"
            },
            user_defined: {
                udf1: 'Additional info 1',
                udf2: 'Additional info 2',
                udf3: strID,
                udf4: tokens,
            },
 
        }, {
            headers: {
                'Authorization': serverKey,  
                'Content-Type': 'application/json'  
            }
        });

        if (response.data && response.data.redirect_url) {
            return res.status(200).json({ redirect_url: response.data.redirect_url });
        } else {
            return res.status(400).json({ error: "Payment initiation failed.", details: response.data });
        }

    } catch (error) {
        console.error('Error in recurringPurchase:', error);
        return res.status(500).json({ error: 'An error occurred during the recurring purchase.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};



module.exports = {
    makePurchase,
    recurringPurchase
};