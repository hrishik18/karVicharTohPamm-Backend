const radioService = require('./radio.service');

// --- Public controllers ---

exports.getStatus = (req, res) => {
    res.json(radioService.getStatus());
};

exports.getPlaylist = async (req, res) => {
    try {
        const list = await radioService.getPlaylist();
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getCurrent = (req, res) => {
    res.json(radioService.getCurrent());
};

// --- Admin: Speaker (live toggle) ---

exports.goLive = (req, res) => {
    try {
        const result = radioService.goLive();
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.stopLive = (req, res) => {
    try {
        const result = radioService.stopLive();
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- Admin: Song controls ---

exports.setSong = (req, res) => {
    try {
        const { title, url, duration } = req.body;
        const result = radioService.setSong(title, url, duration);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- Admin: Playlist management ---

exports.addSongToPlaylist = async (req, res) => {
    try {
        const { title, url, duration } = req.body;
        const song = await radioService.addSongToPlaylist(title, url, duration);
        res.status(201).json(song);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.removeSongFromPlaylist = async (req, res) => {
    try {
        await radioService.removeSongFromPlaylist(req.params.id);
        res.json({ message: 'Song removed' });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

exports.playSongFromPlaylist = async (req, res) => {
    try {
        const { id } = req.body;
        const result = await radioService.playSongFromPlaylist(id);
        res.json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

exports.editSong = async (req, res) => {
    try {
        const { title, url, duration } = req.body;
        const result = await radioService.editSongInPlaylist(req.params.id, { title, url, duration });
        res.json(result);
    } catch (error) {
        const status = error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

exports.reorderSong = async (req, res) => {
    try {
        const { id, direction } = req.body;
        const result = await radioService.reorderSongInPlaylist(id, direction);
        res.json(result);
    } catch (error) {
        const status = error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

exports.moveSong = async (req, res) => {
    try {
        const { id, toIndex } = req.body;
        const result = await radioService.moveSongToIndex(id, toIndex);
        res.json(result);
    } catch (error) {
        const status = error.message.includes('not found') ? 404 : 400;
        res.status(status).json({ message: error.message });
    }
};

exports.bulkRemoveSongs = async (req, res) => {
    try {
        const { ids } = req.body;
        const count = await radioService.bulkRemoveSongs(ids);
        res.json({ message: `${count} song(s) removed` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.shufflePlaylist = async (req, res) => {
    try {
        await radioService.shufflePlaylist();
        const list = await radioService.getPlaylist();
        res.json(list);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.clearPlaylist = async (req, res) => {
    try {
        await radioService.clearPlaylist();
        res.json({ message: 'Playlist cleared' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
