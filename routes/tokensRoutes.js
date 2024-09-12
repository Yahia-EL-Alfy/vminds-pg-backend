const express = require('express');
const { addTokenToUser } = require('../controllers/tokensController');

const router = express.Router();

router.post('/addToken', addTokenToUser);




module.exports = router;
