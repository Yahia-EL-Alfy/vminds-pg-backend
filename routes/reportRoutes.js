const express = require('express');
const { handleReportSubmission } = require('../controllers/reportSupport');

const router = express.Router();

router.post('/report', handleReportSubmission);




module.exports = router;
