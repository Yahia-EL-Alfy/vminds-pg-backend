const express = require('express');
const {getAllbadges} = require('../controllers/imagesController')
const {getParentByCategory,getModelsByParentAndCategory,getCategoriesWithImages} = require('../controllers/fetchAiController')
const router = express.Router();


router.get('/badges', getAllbadges);

router.get('/getCategoriesWithImages', getCategoriesWithImages);

router.post('/getParentByCategory', getParentByCategory);

router.get('/getModelsByParentAndCategory', getModelsByParentAndCategory);




module.exports = router;
