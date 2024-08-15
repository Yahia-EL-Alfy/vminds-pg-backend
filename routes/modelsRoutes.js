const express = require("express");
const { handleChatRequest } = require("../controllers/aiControllers/chatController");

const router = express.Router();

router.post("/chat", handleChatRequest);

module.exports = router;