const express = require('express');
const { startStream, stopStream } = require('../controllers/admin');
const router = express.Router();

router.post('/start-stream', startStream);
router.post('/stop-stream', stopStream);

module.exports = router;
