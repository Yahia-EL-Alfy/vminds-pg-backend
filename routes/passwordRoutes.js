const express = require('express');
const { resetPassword, requestPasswordReset, confirmPasswordReset } = require('../controllers/passwordController');
const authenticate = require('../middlewares/authenticate');  

const router = express.Router();

router.post('/request-reset', requestPasswordReset); 
router.post('/confirm-reset', confirmPasswordReset); 

router.post('/reset-pass', authenticate, resetPassword); 

module.exports = router;
