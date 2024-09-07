const express = require("express");
const multer = require('multer');

const { handleChatRequest } = require("../controllers/aiControllers/chatController");
const { handleImageRequest } = require("../controllers/aiControllers/imageController");
const { handleImageAnalysisRequest, handleLocalImageAnalysisRequest } = require('../controllers/aiControllers/analyseController');
const { handleTextToSpeechRequest } = require('../controllers/aiControllers/speechController');
const { handleMusicGenerationRequest, getUserMusicDetails, handleCustomMusicGenerationRequest } = require('../controllers/aiControllers/musicController');
const { handleLumaGenerationRequest } = require('../controllers/aiControllers/lumaController');
const { handleSimpleImage } = require("../controllers/aiControllers/simpleImage");

const upload = multer();

const router = express.Router();

const ensureUserId = (req, res, next) => {
  if (!req.userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }
  next();
};


router.post("/chat", ensureUserId, handleChatRequest);
router.post("/image", ensureUserId, handleImageRequest);
router.post("/simple-image", ensureUserId, handleSimpleImage);

router.post('/vision', ensureUserId, handleImageAnalysisRequest);
router.post('/analyze-local-image', ensureUserId, upload.single('image'), handleLocalImageAnalysisRequest);

router.post('/tts', ensureUserId, handleTextToSpeechRequest);
router.post('/music', ensureUserId, handleMusicGenerationRequest);
router.get('/music/details', ensureUserId, getUserMusicDetails);
router.post('/music/custom_generate', ensureUserId, handleCustomMusicGenerationRequest);
router.post('/luma-ai/generations', ensureUserId, handleLumaGenerationRequest);

module.exports = router;
