const express = require('express');
const { getAllCancelRequests, updateCancelRequest,addTokenPromoCode } = require('../controllers/adminController');

const router = express.Router();

router.get('/cancel-requests', getAllCancelRequests);

router.put('/cancel-requests/:id', updateCancelRequest);

router.post('/add-token-promo', addTokenPromoCode);

module.exports = router;
