const Song = require('../../models/Song');

const MAX_QUEUE_SIZE = 100;

// In-memory ephemeral state (mode, speaker, current track)
const state = {
    mode: 'music',
    currentSpeaker: null,
    currentTrack: null,
    startTime: null
};

// Guard: track id that was last advanced (prevents duplicate song-ended)
let lastAdvancedTrackId = null;
// Fallback timer: auto-advance if no client reports song-ended
let autoAdvanceTimer = null;

// Broadcast callback — set by socket/index.js
let broadcastFn = null;

const setBroadcast = (fn) => {
    broadcastFn = fn;
};

// Helper: convert Mongoose doc to plain object with `id` string field
const toSongObj = (doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    url: doc.url,
    duration: doc.duration,
    order: doc.order
});

const getStatusPayload = () => ({
    mode: state.mode,
    currentSpeaker: state.currentSpeaker,
    currentTrack: state.currentTrack,
    startTime: state.startTime,
    streamUrl: process.env.STREAM_URL
});

const broadcast = () => {
    if (broadcastFn) {
        broadcastFn('status-update', getStatusPayload());
    }
};

const broadcastPlaylist = async () => {
    if (broadcastFn) {
        const list = await getPlaylist();
        broadcastFn('playlist-update', list);
    }
};

// --- State operations ---

const getStatus = () => getStatusPayload();

const goLive = () => {
    state.mode = 'speaker';
    state.currentSpeaker = true;
    state.currentTrack = null;
    state.startTime = null;
    if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }
    broadcast();
    return getStatusPayload();
};

const stopLive = () => {
    state.mode = 'music';
    state.currentSpeaker = null;
    broadcast();
    return getStatusPayload();
};

const setSong = (title, url, duration) => {
    if (!title || typeof title !== 'string' || !title.trim()) {
        throw new Error('Song title is required');
    }
    if (!url || typeof url !== 'string' || !url.trim()) {
        throw new Error('Song url is required');
    }
    const track = {
        id: require('uuid').v4(),
        title: title.trim(),
        url: url.trim(),
        duration: typeof duration === 'number' && duration > 0 ? duration : null
    };
    state.mode = 'music';
    state.currentTrack = track;
    state.currentSpeaker = null;
    state.startTime = Math.floor(Date.now() / 1000);
    broadcast();
    return getStatusPayload();
};

// --- Playlist operations (persisted to MongoDB) ---

const addSongToPlaylist = async (title, url, duration) => {
    if (!title || typeof title !== 'string' || !title.trim()) {
        throw new Error('Song title is required');
    }
    if (!url || typeof url !== 'string' || !url.trim()) {
        throw new Error('Song url is required');
    }
    const count = await Song.countDocuments();
    if (count >= MAX_QUEUE_SIZE) {
        throw new Error('Playlist is full (max ' + MAX_QUEUE_SIZE + ')');
    }
    const song = await Song.create({
        title: title.trim(),
        url: url.trim(),
        duration: typeof duration === 'number' && duration > 0 ? duration : null,
        order: count
    });
    await broadcastPlaylist();
    return toSongObj(song);
};

const removeSongFromPlaylist = async (id) => {
    if (!id || typeof id !== 'string') {
        throw new Error('Song id is required');
    }
    const song = await Song.findByIdAndDelete(id);
    if (!song) {
        throw new Error('Song not found in playlist');
    }
    await broadcastPlaylist();
};

const playSongFromPlaylist = async (id) => {
    if (!id || typeof id !== 'string') {
        throw new Error('Song id is required');
    }
    const song = await Song.findById(id);
    if (!song) {
        throw new Error('Song not found in playlist');
    }
    state.mode = 'music';
    state.currentTrack = toSongObj(song);
    state.currentSpeaker = null;
    state.startTime = Math.floor(Date.now() / 1000);
    lastAdvancedTrackId = null; // reset guard for new track
    scheduleAutoAdvance(state.currentTrack.duration);
    broadcast();
    return getStatusPayload();
};

// --- Continuous playback: advance to next song, move finished song to end ---

const scheduleAutoAdvance = (duration) => {
    if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
    if (!duration || duration <= 0) return; // no timer if duration unknown
    const timeoutMs = (duration + 5) * 1000; // 5s grace period
    autoAdvanceTimer = setTimeout(() => {
        if (state.currentTrack) {
            advanceToNextSong(state.currentTrack.id).catch(err =>
                console.error('Auto-advance fallback error:', err.message)
            );
        }
    }, timeoutMs);
};

const advanceToNextSong = async (endedSongId) => {
    // Guard: ignore if this track was already advanced
    if (endedSongId === lastAdvancedTrackId) return;
    // Guard: ignore if we're in speaker mode
    if (state.mode === 'speaker') return;
    // Guard: ignore if the ended song is not the current track
    if (!state.currentTrack || state.currentTrack.id !== endedSongId) return;

    lastAdvancedTrackId = endedSongId;
    if (autoAdvanceTimer) { clearTimeout(autoAdvanceTimer); autoAdvanceTimer = null; }

    const songs = await Song.find().sort({ order: 1 });
    if (songs.length === 0) {
        state.currentTrack = null;
        state.startTime = null;
        broadcast();
        return;
    }

    // Find the ended song in the playlist and move it to the end
    const endedIndex = songs.findIndex(s => s._id.toString() === endedSongId);
    if (endedIndex !== -1) {
        const maxOrder = songs.length > 0 ? songs[songs.length - 1].order + 1 : 0;
        songs[endedIndex].order = maxOrder;
        await songs[endedIndex].save();
    }

    // Re-fetch sorted playlist after rotation
    const updatedSongs = await Song.find().sort({ order: 1 });
    if (updatedSongs.length === 0) {
        state.currentTrack = null;
        state.startTime = null;
        broadcast();
        await broadcastPlaylist();
        return;
    }

    // Play the first song in the updated queue
    const nextSong = updatedSongs[0];
    state.mode = 'music';
    state.currentTrack = toSongObj(nextSong);
    state.currentSpeaker = null;
    state.startTime = Math.floor(Date.now() / 1000);
    lastAdvancedTrackId = null; // reset guard for the new track
    scheduleAutoAdvance(nextSong.duration);
    broadcast();
    await broadcastPlaylist();
};

const getPlaylist = async () => {
    const songs = await Song.find().sort({ order: 1 });
    return songs.map((doc, index) => ({ ...toSongObj(doc), order: index + 1 }));
};

const getCurrent = () => ({
    track: state.currentTrack,
    startTime: state.startTime
});

const editSongInPlaylist = async (id, updates) => {
    if (!id || typeof id !== 'string') {
        throw new Error('Song id is required');
    }
    if (!updates || typeof updates !== 'object') {
        throw new Error('Updates object is required');
    }
    const song = await Song.findById(id);
    if (!song) {
        throw new Error('Song not found in playlist');
    }
    const { title, url, duration } = updates;
    let changed = false;
    if (title !== undefined) {
        if (typeof title !== 'string' || !title.trim()) {
            throw new Error('Song title must be a non-empty string');
        }
        song.title = title.trim();
        changed = true;
    }
    if (url !== undefined) {
        if (typeof url !== 'string' || !url.trim()) {
            throw new Error('Song url must be a non-empty string');
        }
        song.url = url.trim();
        changed = true;
    }
    if (duration !== undefined) {
        song.duration = typeof duration === 'number' && duration > 0 ? duration : null;
        changed = true;
    }
    if (!changed) {
        throw new Error('At least one field (title, url, duration) must be provided');
    }
    await song.save();
    await broadcastPlaylist();
    return toSongObj(song);
};

const reorderSongInPlaylist = async (id, direction) => {
    if (!id || typeof id !== 'string') {
        throw new Error('Song id is required');
    }
    if (direction !== 'up' && direction !== 'down') {
        throw new Error('Direction must be "up" or "down"');
    }
    const songs = await Song.find().sort({ order: 1 });
    const index = songs.findIndex(s => s._id.toString() === id);
    if (index === -1) {
        throw new Error('Song not found in playlist');
    }
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= songs.length) {
        // Already at boundary — no-op
        await broadcastPlaylist();
        return getPlaylist();
    }
    // Swap order values
    const tmpOrder = songs[index].order;
    songs[index].order = songs[swapIndex].order;
    songs[swapIndex].order = tmpOrder;
    await songs[index].save();
    await songs[swapIndex].save();

    // After reorder, auto-play whichever song is now at position 0
    const newTopIndex = Math.min(index, swapIndex);
    if (newTopIndex === 0) {
        const newTop = swapIndex === 0 ? songs[swapIndex] : songs[index];
        // Only switch if the new top is different from what's currently playing
        if (!state.currentTrack || state.currentTrack.id !== newTop._id.toString()) {
            state.mode = 'music';
            state.currentTrack = toSongObj(newTop);
            state.currentSpeaker = null;
            state.startTime = Math.floor(Date.now() / 1000);
            lastAdvancedTrackId = null;
            scheduleAutoAdvance(newTop.duration);
            broadcast();
        }
    }

    await broadcastPlaylist();
    return getPlaylist();
};

module.exports = {
    setBroadcast,
    getStatus,
    goLive,
    stopLive,
    setSong,
    addSongToPlaylist,
    removeSongFromPlaylist,
    playSongFromPlaylist,
    getPlaylist,
    getCurrent,
    editSongInPlaylist,
    reorderSongInPlaylist,
    advanceToNextSong
};
