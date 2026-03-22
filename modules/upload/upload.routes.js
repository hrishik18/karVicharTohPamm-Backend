const express = require('express');
const multer = require('multer');
const uploadController = require('./upload.controller');

const ALLOWED_MIMES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed (mp3, wav, ogg, mp4, webm)'));
        }
    },
});

// JWT protection applied at mount level in server.js
router.post('/', (req, res, next) => {
    console.log('[upload.routes] POST /upload hit, content-type:', req.headers['content-type']);
    next();
}, upload.array('files', MAX_FILES), uploadController.uploadFiles);

module.exports = router;
