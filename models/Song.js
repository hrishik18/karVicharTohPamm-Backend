const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
    title: { type: String, required: true },
    url: { type: String, required: true },
    duration: { type: Number, default: null },
    order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Song', SongSchema);
