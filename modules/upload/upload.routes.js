const express = require('express');
const multer = require('multer');
const uploadController = require('./upload.controller');

const ALLOWED_MIMES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed (mp3, wav, ogg, mp4, webm)'));
        }
    },
});

// JWT protection applied at mount level in server.js
router.post('/', upload.single('file'), uploadController.uploadFile);

module.exports = router;
