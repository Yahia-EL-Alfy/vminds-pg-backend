const express = require('express');
const { checkDailyLogin, getUserPoints, getUserStreakInfo, updateDocumentExportCount, convertPointsToTokens } = require('../controllers/pointController');

const router = express.Router();

router.post('/daily-login', checkDailyLogin);

router.get('/all-points/:userId', getUserPoints);

router.get('/daily-streak-info/:userId', getUserStreakInfo);

router.post('/update-document-export', updateDocumentExportCount);
router.post('/convert-gems-to-credits', convertPointsToTokens);



module.exports = router;
