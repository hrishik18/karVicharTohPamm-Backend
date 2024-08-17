const express = require('express');
const { getStreamStatus } = require('../controllers/stream');
const router = express.Router();

router.get('/status', getStreamStatus);

module.exports = router;
