const express = require('express');
const { addPackage, viewAllPackages } = require('../controllers/packageController');
const { addPromoCode, viewAllPromoCodes } = require('../controllers/promocodeController');

const router = express.Router();

router.post('/add-package', addPackage);
router.get('/view-package', viewAllPackages);

router.post('/add-promo', addPromoCode);
router.get('/view-promo', viewAllPromoCodes);

module.exports = router;
