const pool = require('../config/database');
const { addTokenToUserfunc } = require('../controllers/tokensController');
const { sendInvoiceEmail } = require('../utils/mailer');

const callback = async (req, res) => {
    console.log("Request Body:", req.body);

    const {
        tran_ref,
        cart_id,
        payment_result,
        payment_info,
        cart_amount,
        customer_details,
        user_defined,
        token, // Token might be undefined if saveCard is false
        payment_info: { payment_description }
    } = req.body;

    const { udf3 } = user_defined;
    const user_id = parseInt(udf3, 10);
    const { udf4 } = user_defined;
    const tokens = parseInt(udf4, 10);
    const { response_status, response_code, response_message, transaction_time } = payment_result;
    const { payment_method } = payment_info;

    const last4 = payment_description ? payment_description.slice(-4) : ''; // Extract the last 4 digits, if available

    let client;
    try {
        client = await pool.connect();

        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [user_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const { id: userId, email } = userResult.rows[0];

        // Insert into transaction_logs
        const insertTransactionLogQuery = `
            INSERT INTO transaction_logs (user_id, tran_ref, response_code, response_status, response_message, transaction_time, payment_info, cart_id, amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        await client.query(insertTransactionLogQuery, [
            userId,
            tran_ref,
            response_code,
            response_status,
            response_message,
            transaction_time,
            JSON.stringify(payment_info),
            cart_id,
            cart_amount
        ]);

        // Insert into invoices
        const insertInvoiceQuery = `
            INSERT INTO invoices (user_id, trans_ref, cart_id, price, date, payment_method)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;
        const invoiceResult = await client.query(insertInvoiceQuery, [
            userId,
            tran_ref,
            cart_id,
            cart_amount,
            transaction_time,
            payment_method
        ]);

        const invoiceId = invoiceResult.rows[0].id;

        // Store the credit card token and last 4 digits (if token is provided)
        if (token) {
            const insertCcTokenQuery = `
                INSERT INTO users_cc_tokens (user_id, token, last4, payment_description)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (token) DO NOTHING
            `;
            await client.query(insertCcTokenQuery, [userId, token, last4, payment_description]);
        }

        if (response_status === 'A') {
            const packageTypeQuery = 'SELECT type FROM packages WHERE id = $1';
            const packageTypeResult = await client.query(packageTypeQuery, [cart_id]);

            if (packageTypeResult.rows.length > 0) {
                const packageType = packageTypeResult.rows[0].type;

                if (packageType === 1) {
                    const insertUserPackageQuery = `
                        INSERT INTO user_packages (user_id, package_id, tran_ref)
                        VALUES ($1, $2, $3)
                    `;
                    await client.query(insertUserPackageQuery, [userId, cart_id, tran_ref]);
                }
            }

            await addTokenToUserfunc(userId, tokens);

            let total = cart_amount;
            let vat = cart_amount * 15 / 100;
            total = total - vat;

            await sendInvoiceEmail({
                invoiceId,
                total,
                vat,
                cart_amount,
                customerName: customer_details.name,
                customerEmail: email,
                customerAddress: customer_details.street1,
                city: customer_details.city || 'Not provided',
                country: customer_details.country || 'Not provided',
                tran_ref,
                transaction_time,
                payment_method,
                payment_description,
                package_description: `Purchase of package ${cart_id}`
            });

            return res.status(200).json({ message: 'Payment verified, tokens added, and invoice emailed.' });
        } else {
            return res.status(400).json({
                error: 'Payment failed or canceled.',
                message: response_message
            });
        }
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
