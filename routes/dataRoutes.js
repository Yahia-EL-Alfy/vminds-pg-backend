const express = require('express');
const {getAllDailyLoginImages} = require('../controllers/imagesController')
const {getParentByCategory,getModelsByParentAndCategory} = require('../controllers/fetchAiController')
const router = express.Router();


router.get('/daily-logins-images', getAllDailyLoginImages);
router.get('/getParentByCategory', getParentByCategory);

router.get('/getModelsByParentAndCategory', getModelsByParentAndCategory);




module.exports = router;
