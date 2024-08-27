const express = require('express');
const {getAllDailyLoginImages} = require('../controllers/imagesController')
const router = express.Router();


router.get('/daily-logins-images', getAllDailyLoginImages);




module.exports = router;
