const express = require('express');
const { callback } = require('../payment/callback');


const router = express.Router();

router.post('/call-back', callback);


module.exports = router;
