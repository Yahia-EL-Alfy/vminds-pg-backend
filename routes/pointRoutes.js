const express = require('express');
const rateLimit = require('express-rate-limit');
const {
    checkDailyLogin,
    updateDocumentExportCount,
    convertPointsToTokens
} = require('../controllers/pointController');

const router = express.Router();

const dailyLoginLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, 
    max: 1, 
    message: 'You have already logged in today. Please try again tomorrow.',
    keyGenerator: (req) => req.userId 
});

router.post('/daily-login', dailyLoginLimiter, checkDailyLogin);


router.post('/update-document-export', updateDocumentExportCount);

router.post('/convert-gems-to-credits', convertPointsToTokens);

module.exports = router;
