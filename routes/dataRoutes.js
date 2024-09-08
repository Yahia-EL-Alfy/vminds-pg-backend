const express = require('express');
const {getAllDailyLoginImages} = require('../controllers/imagesController')
const {getParentByCategory,getModelsByParentAndCategory,getCategoriesWithImages} = require('../controllers/fetchAiController')
const router = express.Router();


router.get('/daily-logins-images', getAllDailyLoginImages);

router.get('/getCategoriesWithImages', getCategoriesWithImages);

router.get('/getParentByCategory/:category_id', getParentByCategory);

router.get('/getModelsByParentAndCategory', getModelsByParentAndCategory);




module.exports = router;
