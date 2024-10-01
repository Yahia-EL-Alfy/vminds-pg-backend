const express = require('express');
const { makePurchase, recurringPurchase } = require('../payment/PT2Controller');


const router = express.Router();

router.post('/create-payment', makePurchase);
router.post('/recurring-payment', recurringPurchase);


module.exports = router;
