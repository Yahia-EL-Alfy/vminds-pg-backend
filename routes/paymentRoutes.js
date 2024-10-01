const express = require('express');
const { makePurchase, getAllTransactions, getTransactionDetails, processRefund } = require('../payment/paymentController');
const { callback } = require('../payment/callback');


const router = express.Router();

router.post('/create-payment', makePurchase);
router.post('/call-back', callback);
router.get('/transactions', getAllTransactions);
router.post('/transaction-details', getTransactionDetails);

router.post('/refund', processRefund);


module.exports = router;
