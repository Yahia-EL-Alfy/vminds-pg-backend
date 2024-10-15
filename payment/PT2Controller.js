const pool = require('../config/database');
const axios = require('axios');

require('dotenv').config();

const profileID = process.env.PAYTABS_PROFILE_ID;
const serverKey = process.env.PAYTABS_SERVER_KEY;
const paytabsUrl = `https://secure.PayTabs.sa/payment/request`;

// const makePurchase = async (req, res) => {
//     const userId = req.userId;
//     const { packageId, promoCode } = req.body;
//     let client;
//     const callbackURL = process.env.CALLBACK_URL;
//     const returnURL = process.env.RETURN_URL;

//     try {
//         client = await pool.connect();

//         // Fetch package data
//         const packageQuery = 'SELECT * FROM packages WHERE id = $1';
//         const packageResult = await client.query(packageQuery, [packageId]);

//         if (packageResult.rows.length === 0) {
//             return res.status(404).json({ error: "Package not found." });
//         }

//         let { price, tokens } = packageResult.rows[0];
//         price = parseFloat(price);

//         // Handle promo code
//         let promoCodeId = null;
//         if (promoCode) {
//             const promoQuery = 'SELECT * FROM promocodes WHERE code = $1 AND expiry_date > NOW()';
//             const promoResult = await client.query(promoQuery, [promoCode]);

//             if (promoResult.rows.length === 0) {
//                 return res.status(400).json({ error: "Invalid or expired promo code." });
//             }

//             const { id: promoId, discount, extra_tokens } = promoResult.rows[0];
//             promoCodeId = promoId;

//             if (discount) {
//                 price = price - (price * parseFloat(discount) / 100);
//             } else if (extra_tokens) {
//                 tokens += extra_tokens;
//             }

//             if (isNaN(price)) {
//                 return res.status(400).json({ error: "Invalid adjusted price after applying promo code." });
//             }
//         }

//         // Fetch user data
//         const userQuery = 'SELECT * FROM users WHERE id = $1';
//         const userResult = await client.query(userQuery, [userId]);
//         const user = userResult.rows[0];

//         if (!user) {
//             return res.status(404).json({ error: "User not found." });
//         }

//         // Customer details
//         const customer_details = {
//             name: `${user.first_name} ${user.last_name}`,
//             email: user.email,
//             phone: user.phone || '',
//             street1: user.street || 'Street not provided',
//             city: user.city || 'City not provided',
//             country: user.country || 'Algeria',
//             zip: user.zip || '11728',
//         };

//         // Cart details (using the packageId directly as the cart id)
//         const cart = {
//             id: packageId.toString(),  // Using packageId as cart ID
//             currency: "SAR",
//             amount: price.toFixed(2),
//             description: `Purchase of package ${packageId}`
//         };
//         const strID = userId.toString();
//         // Invoice request with notification
//         const response = await axios.post(paytabsUrl, {
//             profile_id: process.env.PAYTABS_PROFILE_ID, 
//             payment_methods: ["creditcard", "stcpay", "applepay", "mada"],
//             tran_type: "sale",
//             tran_class: "ecom",
//             cart_id: cart.id,
//             cart_currency: cart.currency,
//             cart_amount: cart.amount,
//             cart_description: cart.description,
//             hide_shipping: true,
//             return: returnURL,
//             callback: callbackURL,
//             tokenise: 2,
//             token: "2C4654BC67A3EF32C6BE91F56D857CBC",

//             customer_details: customer_details,
//             user_defined: {
//                 udf1: 'Additional info 1',
//                 udf2: 'Additional info 2',
//                 udf3: strID,
//                 udf4: tokens,
//             },
//             invoice: {
//                 shipping_charges: 0,
//                 extra_charges: 0,
//                 extra_discount: 0,
//                 total: price.toFixed(2),
//                 notifications: {
//                     emails: ["yahiawalid95@gmail.com"]
//                 },
//                 line_items: [
//                     {
//                         sku: "sku",
//                         description: "Test Description",
//                         unit_cost: price.toFixed(2),
//                         quantity: 1,
//                         net_total: price.toFixed(2),
//                         total: price.toFixed(2)
//                     }
//                 ]
//             }
//         }, {
//             headers: {
//                 'Authorization': serverKey,  
//                 'Content-Type': 'application/json'  
//             }
//         });

//         // Handle response
//         if (response.data && response.data.redirect_url) {
//             return res.status(200).json({ redirect_url: response.data.redirect_url });
//         } else {
//             return res.status(400).json({ error: "Payment initiation failed.", details: response.data });
//         }

//     } catch (error) {
//         console.error('Error in makePurchase:', error);
//         return res.status(500).json({ error: 'An error occurred during the purchase.' });
//     } finally {
//         if (client) {
//             client.release();
//         }
//     }
// };

const makePurchase = async (req, res) => {
    const userId = req.userId;
    const { packageId, promoCode, saveCard, token } = req.body; // Added token to destructure
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

        // Cart details
        const cart = {
            id: packageId.toString(),
            currency: "SAR",
            amount: price.toFixed(2),
            description: `Purchase of package ${packageId}`
        };

        const requestData = {
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
                udf3: userId.toString(),
                udf4: tokens,
            }
        };

        // Handle tokenization logic
        if (saveCard) {
            requestData.tokenise = 2;  // Save card details for future use
        } else if (token) {
            // Add the token if saveCard is false and a token is provided
            requestData.token = token;
        }

        // Send the payment request
        const response = await axios.post(paytabsUrl, requestData, {
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
        const strID = userId.toString();

        const cart = {
            id: packageId.toString(),  
            currency: "SAR",
            amount: price,  
            description: strID
        };
        console.log(price);
        // Invoice request with recurring payment agreement
        const response = await axios.post(paytabsUrl, {
            profile_id: process.env.PAYTABS_PROFILE_ID,
            payment_methods: ["creditcard", "stcpay", "applepay" , "mada"],
            tran_type: "sale",
            tran_class: "ecom",
            cart_id: cart.id,
            cart_currency: cart.currency,
            cart_amount: cart.amount,
            tokenise: 2,  
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
                first_installment_due_date: "04/OCT/2024"
            },
            // user_defined: {
            //     udf1: 'Additional info 1',
            //     udf2: 'Additional info 2',
            //     udf4: tokens,
            // },
 
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

const refund = async (req, res) => {
    const { tran_ref, refund_reason } = req.body;

    if (!tran_ref || !refund_reason) {
        return res.status(400).json({ error: 'tran_ref and refund_reason are required.' });
    }

    let client;
    try {
        client = await pool.connect();

        // 1. Check if the transaction has already been refunded
        const checkRefundQuery = `SELECT * FROM refunds WHERE tran_ref = $1`;
        const checkRefundResult = await client.query(checkRefundQuery, [tran_ref]);

        if (checkRefundResult.rows.length > 0) {
            return res.status(400).json({ error: 'Transaction has already been refunded.' });
        }

        // 2. Fetch the transaction details from transaction_logs
        const transactionQuery = `
            SELECT * FROM transaction_logs WHERE tran_ref = $1
        `;
        const transactionResult = await client.query(transactionQuery, [tran_ref]);

        if (transactionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        const transaction = transactionResult.rows[0];
        const { user_id, amount, transaction_time, cart_id } = transaction;

        // 3. Check if the refund is within 7 days
        const transactionDate = new Date(transaction_time);
        const currentDate = new Date();
        const timeDiff = currentDate - transactionDate;
        const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

        if (daysDiff > 7) {
            return res.status(400).json({ error: 'Refund request is past the allowed 7-day window.' });
        }

        // 4. Fetch the package details (tokens available for that cart_id)
        const packageQuery = `SELECT * FROM packages WHERE id = $1`;
        const packageResult = await client.query(packageQuery, [cart_id]);

        if (packageResult.rows.length === 0) {
            return res.status(404).json({ error: 'Package not found.' });
        }

        const packageData = packageResult.rows[0];
        const { tokens: packageTokens } = packageData;

        // 5. Fetch user token details
        const userQuery = `SELECT available_tokens, tokens_used FROM users WHERE id = $1`;
        const userResult = await client.query(userQuery, [user_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const { available_tokens, tokens_used } = userResult.rows[0];

        // 6. Check if the user has used less than 20% of their tokens
        const maxTokenUsage = packageTokens * 0.20;

        if (tokens_used > maxTokenUsage) {
            return res.status(400).json({ error: 'User has used more than 20% of the package quota, refund not allowed.' });
        }

        // 7. Calculate the refund amount (with 15% processing charge)
        const refundAmount = amount - (amount * 0.15);

        // 8. Check if the package is in the user_packages table and delete if exists
        const userPackageQuery = `
            SELECT * FROM user_packages WHERE tran_ref = $1
        `;
        const userPackageResult = await client.query(userPackageQuery, [tran_ref]);

        if (userPackageResult.rows.length > 0) {
            const deleteUserPackageQuery = `
                DELETE FROM user_packages WHERE tran_ref = $1
            `;
            await client.query(deleteUserPackageQuery, [tran_ref]);
        }

        // 9. Make the refund request to PayTabs
        const refundRequestBody = {
            profile_id: profileID,
            tran_type: "refund",
            tran_class: "ecom",
            cart_id: `cart_${cart_id}`,  // Replace with actual cart_id
            cart_currency: "SAR",
            cart_amount: refundAmount,
            cart_description: refund_reason,
            tran_ref: tran_ref
        };

        // Assuming PayTabs refund API endpoint
        const paytabsResponse = await axios.post(paytabsUrl, refundRequestBody, {
            headers: {
                Authorization: serverKey
            }
        });
        console.log('PayTabs refund response:', paytabsResponse.data);


        if (paytabsResponse.status !== 200) {
            return res.status(500).json({ error: 'Refund request failed.' });
        }

        // 10. Update user tokens (subtract remaining tokens from the package)
        const newAvailableTokens = available_tokens - packageTokens;

        const updateUserTokensQuery = `
            UPDATE users
            SET available_tokens = $1
            WHERE id = $2
        `;
        await client.query(updateUserTokensQuery, [newAvailableTokens, user_id]);

        const insertRefundQuery = `
            INSERT INTO refunds (user_id, tran_ref, refund_amount, refund_reason, refund_tran_ref)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(insertRefundQuery, [user_id, tran_ref, refundAmount, refund_reason, paytabsResponse.data.tran_ref]);


        res.status(200).json({
            message: 'Refund processed successfully.',
            refundAmount: refundAmount,
            remainingTokens: newAvailableTokens
        });

    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({ error: 'An error occurred while processing the refund.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const cancelAgreement = async (req, res) => {
    const user_id = req.userId;

    if (!user_id) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    let client;
    try {
        client = await pool.connect();

        // 1. Fetch agreements for the user
        const agreementQuery = 'SELECT * FROM user_agreements WHERE user_id = $1';
        const agreementResult = await client.query(agreementQuery, [user_id]);

        if (agreementResult.rows.length === 0) {
            return res.status(404).json({ error: 'No agreements found for this user.' });
        }

        // 2. Insert each agreement into the cancel_requests table
        for (let agreement of agreementResult.rows) {
            const insertCancelRequestQuery = `
                INSERT INTO cancel_requests (agreement_id, user_id, cancelled)
                VALUES ($1, $2, $3)
            `;
            await client.query(insertCancelRequestQuery, [agreement.agreement_id, user_id, false]);
        }

        return res.status(200).json({ message: 'Cancellation requests created successfully.' });

    } catch (error) {
        console.error('Error in cancelAgreement handler:', error);
        return res.status(500).json({ error: 'An error occurred while processing the cancellation request.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};

module.exports = {
    makePurchase,
    recurringPurchase,
    refund,
    cancelAgreement
};