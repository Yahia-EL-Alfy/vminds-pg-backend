const express = require('express');
const { makePurchase, recurringPurchase, refund, cancelAgreement } = require('../payment/PT2Controller');


const router = express.Router();

router.post('/create-payment', makePurchase);
router.post('/recurring-payment', recurringPurchase);
router.post('/refund', refund);
router.post('/cancel-agreement', cancelAgreement);




module.exports = router;
