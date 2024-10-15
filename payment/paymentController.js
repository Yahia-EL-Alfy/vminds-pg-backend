const pool = require('../config/database');
const PayTabs = require('paytabs_pt2');
const { addTokenToUserfunc } = require('../controllers/tokensController');

require('dotenv').config();



const profileID = process.env.PAYTABS_PROFILE_ID;
const serverKey = process.env.PAYTABS_SERVER_KEY;
const region = process.env.PAYTABS_REGION;
PayTabs.setConfig(profileID, serverKey, region);


const makePurchase = async (req, res) => {
    const userId = req.userId;
    const { packageId, promoCode } = req.body;
    let client;
    const callbackURL = process.env.CALLBACK_URL;
    const returnURL = process.env.RETURN_URL;

    try {
        client = await pool.connect();

        const packageQuery = 'SELECT * FROM packages WHERE id = $1';
        const packageResult = await client.query(packageQuery, [packageId]);

        if (packageResult.rows.length === 0) {
            return res.status(404).json({ error: "Package not found." });
        }

        let { price, tokens } = packageResult.rows[0];
        price = parseFloat(price);

        if (isNaN(price)) {
            return res.status(400).json({ error: "Invalid price data from database." });
        }

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

        const cartInsertQuery = `
            INSERT INTO cart (price, tokens, package_id, promo_code_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id
        `;
        const cartResult = await client.query(cartInsertQuery, [price, tokens, packageId, promoCodeId]);
        const cartId = cartResult.rows[0].id;

        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [userId]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const customer_details = [
            `${user.first_name} ${user.last_name}`,
            user.email,
            user.phone || '',
            user.street || 'Street not provided',
            user.city || 'City not provided',
            user.state || 'State not provided',
            user.country || 'Algeria',
            user.zip || '11728',
            req.ip
        ];

        const cart = {
            id: cartId.toString(),
            currency: "SAR",
            amount: price.toFixed(2),
            description: `Purchase of package ${packageId}`
        };

        PayTabs.createPaymentPage(
            ["creditcard", "stcpay", "applepay" , "mada"],
            ['sale', 'ecom'],
            [cart.id, cart.currency, cart.amount, cart.description],
            customer_details,
            customer_details,
            [callbackURL, returnURL],
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



const getAllTransactions = async (req, res) => {
    const userId = req.userId;

    let client;
    try {
        client = await pool.connect();

        const transactionQuery = `
            SELECT * FROM invoices 
            WHERE user_id = $1
            ORDER BY created_at DESC
        `;
        const result = await client.query(transactionQuery, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No transactions found for this user.' });
        }

        return res.status(200).json({ transactions: result.rows });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return res.status(500).json({ error: 'An error occurred while fetching transactions.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};

const getTransactionDetails = async (req, res) => {
    const { tran_ref } = req.body;

    if (!tran_ref) {
        return res.status(400).json({ error: 'Transaction reference is required.' });
    }

    try {
        const queryRequested = function (results) {
            console.log('Transaction Details:', results);

            if (results) {
                return res.status(200).json({ transaction: results });
            } else {
                return res.status(404).json({ error: 'Transaction not found.' });
            }
        };

        PayTabs.validatePayment(tran_ref, queryRequested);

    } catch (error) {
        console.error('Error in getTransactionDetails:', error);
        return res.status(500).json({ error: 'An error occurred while fetching transaction details.' });
    }
};

const processRefund = async (req, res) => {
    const { tran_ref } = req.body;

    if (!tran_ref) {
        return res.status(400).json({ error: 'Transaction reference is required.' });
    }

    let client;
    try {
        client = await pool.connect();

        // Step 1: Fetch the cart ID using the transaction reference
        const transactionQuery = 'SELECT cart_id, user_id FROM transaction_logs WHERE tran_ref = $1';
        const transactionResult = await client.query(transactionQuery, [tran_ref]);

        if (transactionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction reference not found.' });
        }

        const cartId = transactionResult.rows[0].cart_id;
        const userId = transactionResult.rows[0].user_id;

        // Step 2: Fetch cart details
        const cartQuery = 'SELECT * FROM cart WHERE id = $1';
        const cartResult = await client.query(cartQuery, [cartId]);

        if (cartResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cart not found.' });
        }

        const { price, tokens } = cartResult.rows[0];

        let transaction = {
            ref: tran_ref,
            typ: 'refund',
            cls: 'ecom'
        };
        let cart = {
            id: cartId.toString(),
            currency: 'SAR',
            amount: price,
            description: `Refund for cart ID ${cartId}`
        };

        // Step 3: Define the callback function
        let transactionCreated = async function (results) {
            console.log('Refund transaction results:', results);

            if (results && results.payment_result) {
                const {
                    tran_ref: new_tran_ref,
                    previous_tran_ref,
                    payment_result: {
                        response_status,
                        response_code,
                        response_message,
                        transaction_time
                    }
                } = results;

                if (response_status === 'A') {
                    // Step 4: Insert the new transaction into the logs
                    const insertTransactionLogQuery = `
                        INSERT INTO transaction_logs (
                            user_id, tran_ref, response_code, response_status, response_message, transaction_time, 
                            cart_id, amount
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `;

                    await client.query(insertTransactionLogQuery, [
                        userId,
                        new_tran_ref,  // Use the new transaction reference
                        response_code,
                        response_status,
                        response_message,
                        transaction_time,
                        cartId,
                        cart.amount
                    ]);

                    // Step 5: Insert into the refund table
                    const insertRefundQuery = `
                        INSERT INTO refund (
                            user_id, tran_ref, previous_tran_ref, amount
                        ) VALUES ($1, $2, $3, $4)
                    `;

                    await client.query(insertRefundQuery, [
                        userId,
                        new_tran_ref,  // The new transaction reference
                        previous_tran_ref,
                        cart.amount
                    ]);

                    // Step 6: Deduct tokens from the user
                    await client.query(
                        `UPDATE users SET available_tokens = available_tokens - $1 WHERE id = $2`,
                        [tokens, userId]
                    );

                    return res.status(200).json({ message: 'Refund processed successfully.' });
                } else {
                    return res.status(400).json({
                        error: 'Refund failed.',
                        message: response_message
                    });
                }
            } else {
                console.error('Invalid refund response structure:', results);
                return res.status(400).json({ error: 'Invalid refund response.' });
            }
        };

        // Step 6: Call the PayTabs API for refund
        PayTabs.queryTransaction([transaction.ref, transaction.typ, transaction.cls], 
                                 [cart.id, cart.currency, cart.amount, cart.description], 
                                 transactionCreated);

    } catch (error) {
        console.error('Error processing refund:', error);
        return res.status(500).json({ error: 'An error occurred while processing the refund.' });
    } finally {
        if (client) {
            client.release();
        }
    }
};


module.exports = {
    makePurchase,
    getAllTransactions,
    getTransactionDetails,
    processRefund
};
