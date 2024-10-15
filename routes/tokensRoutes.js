const express = require('express');
const { addTokenToUser } = require('../controllers/tokensController');
const { applyTokensPromoCode } = require('../controllers/promocodeController');

const router = express.Router();

router.post('/addToken', addTokenToUser);


router.post('/apply-token-promo', applyTokensPromoCode);


module.exports = router;
