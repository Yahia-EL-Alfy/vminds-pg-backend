const express = require('express');
const { signUp, signIn,signUpThirdParty, deleteUsageLogs,deleteUserAndLogs } = require('../controllers/authController');
const { validateSignUp, validateSignIn } = require('../middlewares/validateRequest'); 

const { verifyEmail } = require('../controllers/verificationController');

const authenticate = require('../middlewares/authenticate');  


const router = express.Router();

router.post('/signup', signUp);
router.post('/verify', verifyEmail);
router.post('/signup-thirdParty', signUpThirdParty);

router.post('/signin', signIn);

router.delete('/delete-all-chats', authenticate, deleteUsageLogs);

router.delete('/delete-user', authenticate, deleteUserAndLogs);


module.exports = router;
