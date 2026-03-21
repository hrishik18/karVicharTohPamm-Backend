const express = require('express');
const radioController = require('./radio.controller');

// Public routes — no authentication
const publicRouter = express.Router();
publicRouter.get('/status', radioController.getStatus);
publicRouter.get('/queue', radioController.getQueue);
publicRouter.get('/playlist', radioController.getPlaylist);
publicRouter.get('/current', radioController.getCurrent);

// Admin routes — JWT protection applied at mount level in server.js
const adminRouter = express.Router();
adminRouter.post('/mode', radioController.setMode);
adminRouter.post('/speaker', radioController.setSpeaker);
adminRouter.post('/song', radioController.setSong);
adminRouter.post('/song/queue', radioController.addSongToQueue);
adminRouter.delete('/song/:id', radioController.removeSongFromQueue);
adminRouter.post('/speaker/queue', radioController.addSpeakerToQueue);
adminRouter.post('/song/select', radioController.selectSong);
adminRouter.post('/speaker/select', radioController.selectSpeaker);

module.exports = { publicRouter, adminRouter };
