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

router.post("/chat", handleChatRequest);
router.post("/image", handleImageRequest);
router.post("/simple-image", handleSimpleImage);

router.post('/vision', handleImageAnalysisRequest);
router.post('/analyze-local-image', upload.single('image'), handleLocalImageAnalysisRequest);

router.post('/tts', handleTextToSpeechRequest);
router.post('/music', handleMusicGenerationRequest);
router.get('/music/details', getUserMusicDetails);
router.post('/music/custom_generate', handleCustomMusicGenerationRequest);
router.post('/luma-ai/generations', handleLumaGenerationRequest);

module.exports = router;
