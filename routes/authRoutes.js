const express = require('express');
const { signUp, signIn,signUpThirdParty } = require('../controllers/authController');
const { validateSignUp, validateSignIn } = require('../middlewares/validateRequest'); 

const { verifyEmail } = require('../controllers/verificationController');



const router = express.Router();

router.post('/signup', validateSignUp, signUp);
router.post('/verify', verifyEmail);
router.post('/signup-thirdParty', signUpThirdParty);

router.post('/signin', validateSignIn, signIn);

// router.post('/daily-login/:userId', dailyLoginReward);



module.exports = router;
