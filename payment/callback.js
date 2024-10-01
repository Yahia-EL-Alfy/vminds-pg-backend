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
        agreement_id // Agreement ID might be present
    } = req.body;

    const { udf3 } = user_defined;
    const user_id = parseInt(udf3, 10);
    const { udf4 } = user_defined;
    const tokens = parseInt(udf4, 10);
    const { response_status, response_code, response_message, transaction_time } = payment_result;
    const { payment_method, payment_description } = payment_info;

    let client;
    try {
        client = await pool.connect();

        // Fetch user details using user_id from user-defined attributes
        const userQuery = 'SELECT * FROM users WHERE id = $1';
        const userResult = await client.query(userQuery, [user_id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const { id: userId, email } = userResult.rows[0];

        // Log transaction
        const insertTransactionLogQuery = `
            INSERT INTO transaction_logs (user_id, tran_ref, response_code, response_status, response_message, transaction_time, payment_info, amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await client.query(insertTransactionLogQuery, [
            userId,
            tran_ref,
            response_code,
            response_status,
            response_message,
            transaction_time,
            JSON.stringify(payment_info), // Serialize payment info
            cart_amount
        ]);

        // Store invoice data in the invoices table
        const insertInvoiceQuery = `
            INSERT INTO invoices (user_id, trans_ref, cart_id, price, date, payment_method)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await client.query(insertInvoiceQuery, [
            userId,
            tran_ref,
            cart_id,
            cart_amount,
            transaction_time, // Storing transaction time as the invoice date
            payment_method
        ]);

        // If agreement_id exists in the request, store it in the user_agreements table
        if (agreement_id) {
            const insertAgreementQuery = `
                INSERT INTO user_agreements (user_id, agreement_id)
                VALUES ($1, $2)
            `;
            await client.query(insertAgreementQuery, [userId, agreement_id]);
        }

        // Handle successful payment
        if (response_status === 'A') {
            const insertUserPackageQuery = `
                INSERT INTO user_packages (user_id, package_id)
                VALUES ($1, $2)
            `;
            await client.query(insertUserPackageQuery, [userId, cart_id]);

            await addTokenToUserfunc(userId, tokens);

            let total = cart_amount;
            let vat = cart_amount * 15 / 100; 
            total = total - vat; 
            
            await sendInvoiceEmail({
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
