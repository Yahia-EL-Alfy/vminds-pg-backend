const express = require('express');
const { 
  getUserGemsAndCredit, 
  getUserDetailsAndAchiv, 
  getUserBadges, 
  getPopularTools, 
  getLastModelUsage, 
  getAlltools, 
  getRecentUsageLogs, 
  getDailyLoginImages,
  openChat,
  addBookmark,
  getAllBookmarksForUser
} = require('../controllers/uiDataController');
const { getUserRanking } = require('../controllers/pointController');

const router = express.Router();

router.get('/gems-and-credit', getUserGemsAndCredit);
router.get('/points-page', getUserDetailsAndAchiv);
router.get('/user-badges', getUserBadges);
router.get('/user-rank', getUserRanking);

router.get('/popular-tools', getPopularTools);
router.get('/last-tool', getLastModelUsage);
router.get('/all-tools', getAlltools);
router.get('/recent-usage-logs', getRecentUsageLogs); 
router.get('/open-chat', openChat); 
router.post('/add-bookmark', addBookmark); 
router.get('/all-bookmarks', getAllBookmarksForUser); 




router.get('/daily-images', getDailyLoginImages);



module.exports = router;
