const express = require('express');
const radioController = require('./radio.controller');

// Public routes — no authentication
const publicRouter = express.Router();
publicRouter.get('/status', radioController.getStatus);
publicRouter.get('/playlist', radioController.getPlaylist);
publicRouter.get('/current', radioController.getCurrent);

// Admin routes — JWT protection applied at mount level in server.js
const adminRouter = express.Router();

// Speaker: live toggle (not a queue — just go live / stop live)
adminRouter.post('/live', radioController.goLive);         // go live as speaker
adminRouter.post('/live/stop', radioController.stopLive);  // stop live, back to music

// Song: set current track directly
adminRouter.post('/song', radioController.setSong);

// Playlist: manage the song queue
adminRouter.post('/song/playlist', radioController.addSongToPlaylist);
adminRouter.delete('/song/:id', radioController.removeSongFromPlaylist);
adminRouter.post('/song/play', radioController.playSongFromPlaylist);    // pick from playlist to play now
adminRouter.patch('/song/:id', radioController.editSong);
adminRouter.post('/song/reorder', radioController.reorderSong);
adminRouter.post('/song/bulk-remove', radioController.bulkRemoveSongs);
adminRouter.post('/song/shuffle', radioController.shufflePlaylist);
adminRouter.delete('/song/clear', radioController.clearPlaylist);

module.exports = { publicRouter, adminRouter };
