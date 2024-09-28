const express = require('express');
const { getUserGemsAndCredit, getUserDetailsAndAchiv, getUserBadges } = require('../controllers/uiDataController');
const { getUserRanking } = require('../controllers/pointController');

const router = express.Router();

router.get('/gems-and-credit', getUserGemsAndCredit);
router.get('/points-page', getUserDetailsAndAchiv);
router.get('/user-badges', getUserBadges);
router.get('/user-rank', getUserRanking);




module.exports = router;
