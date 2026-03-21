const radioService = require('./radio.service');

// --- Public controllers ---

exports.getStatus = (req, res) => {
    res.json(radioService.getStatus());
};

exports.getQueue = (req, res) => {
    res.json(radioService.getQueue());
};

// --- Admin controllers ---

exports.setMode = (req, res) => {
    try {
        const { mode } = req.body;
        const result = radioService.setMode(mode);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.setSpeaker = (req, res) => {
    try {
        const { name } = req.body;
        const result = radioService.setSpeaker(name);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.setSong = (req, res) => {
    try {
        const { title, url, duration } = req.body;
        const result = radioService.setSong(title, url, duration);
        res.json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- Queue controllers ---

exports.addSongToQueue = (req, res) => {
    try {
        const { title, url, duration } = req.body;
        const song = radioService.addSongToQueue(title, url, duration);
        res.status(201).json(song);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.removeSongFromQueue = (req, res) => {
    try {
        radioService.removeSongFromQueue(req.params.id);
        res.json({ message: 'Song removed' });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

exports.addSpeakerToQueue = (req, res) => {
    try {
        const { name } = req.body;
        const speaker = radioService.addSpeakerToQueue(name);
        res.status(201).json(speaker);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- Select from queue controllers ---

exports.selectSong = (req, res) => {
    try {
        const { id } = req.body;
        const result = radioService.selectSongFromQueue(id);
        res.json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

exports.selectSpeaker = (req, res) => {
    try {
        const { id } = req.body;
        const result = radioService.selectSpeakerFromQueue(id);
        res.json(result);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

// --- Playlist controllers ---

exports.getPlaylist = (req, res) => {
    res.json(radioService.getPlaylist());
};

exports.getCurrent = (req, res) => {
    res.json(radioService.getCurrent());
};
