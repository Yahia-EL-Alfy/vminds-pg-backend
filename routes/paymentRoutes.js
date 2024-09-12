const express = require('express');
const { makePurchase } = require('../payment/paymentController');
const { callback } = require('../payment/callback');


const router = express.Router();

router.post('/create-payment', makePurchase);
router.post('/call-back', callback);


module.exports = router;
