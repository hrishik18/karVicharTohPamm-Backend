const { v4: uuidv4 } = require('uuid');

const MAX_QUEUE_SIZE = 100;

// In-memory state — no database
const state = {
    mode: 'music',
    currentSpeaker: null,
    currentTrack: null,
    startTime: null
};

const queue = {
    songs: [],
    speakers: []
};

// Broadcast callback — set by socket/index.js
let broadcastFn = null;

const setBroadcast = (fn) => {
    broadcastFn = fn;
};

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

// --- State operations ---

const getStatus = () => getStatusPayload();

const getQueue = () => ({
    songs: [...queue.songs],
    speakers: [...queue.speakers]
});

const setMode = (mode) => {
    if (mode !== 'music' && mode !== 'speaker') {
        throw new Error('Mode must be "music" or "speaker"');
    }
    state.mode = mode;
    // Clear opposite field
    if (mode === 'music') {
        state.currentSpeaker = null;
    } else {
        state.currentTrack = null;
        state.startTime = null;
    }
    broadcast();
    return getStatusPayload();
};

const setSpeaker = (name) => {
    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error('Speaker name is required');
    }
    name = name.trim();
    state.mode = 'speaker';
    state.currentSpeaker = name;
    state.currentTrack = null;
    state.startTime = null;
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
        id: uuidv4(),
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

// --- Queue operations ---

const addSongToQueue = (title, url, duration) => {
    if (!title || typeof title !== 'string' || !title.trim()) {
        throw new Error('Song title is required');
    }
    if (!url || typeof url !== 'string' || !url.trim()) {
        throw new Error('Song url is required');
    }
    if (queue.songs.length >= MAX_QUEUE_SIZE) {
        throw new Error('Song queue is full (max ' + MAX_QUEUE_SIZE + ')');
    }
    const song = {
        id: uuidv4(),
        title: title.trim(),
        url: url.trim(),
        duration: typeof duration === 'number' && duration > 0 ? duration : null
    };
    queue.songs.push(song);
    broadcastPlaylist();
    return song;
};

const removeSongFromQueue = (id) => {
    if (!id || typeof id !== 'string') {
        throw new Error('Song id is required');
    }
    const index = queue.songs.findIndex(s => s.id === id);
    if (index === -1) {
        throw new Error('Song not found in queue');
    }
    queue.songs.splice(index, 1);
    broadcastPlaylist();
};

const addSpeakerToQueue = (name) => {
    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error('Speaker name is required');
    }
    if (queue.speakers.length >= MAX_QUEUE_SIZE) {
        throw new Error('Speaker queue is full (max ' + MAX_QUEUE_SIZE + ')');
    }
    const speaker = { id: uuidv4(), name: name.trim() };
    queue.speakers.push(speaker);
    return speaker;
};

// --- Select from queue ---

const selectSongFromQueue = (id) => {
    if (!id || typeof id !== 'string') {
        throw new Error('Song id is required');
    }
    const song = queue.songs.find(s => s.id === id);
    if (!song) {
        throw new Error('Song not found in queue');
    }
    state.mode = 'music';
    state.currentTrack = { ...song };
    state.currentSpeaker = null;
    state.startTime = Math.floor(Date.now() / 1000);
    broadcast();
    return getStatusPayload();
};

const selectSpeakerFromQueue = (id) => {
    if (!id || typeof id !== 'string') {
        throw new Error('Speaker id is required');
    }
    const speaker = queue.speakers.find(s => s.id === id);
    if (!speaker) {
        throw new Error('Speaker not found in queue');
    }
    state.mode = 'speaker';
    state.currentSpeaker = speaker.name;
    state.currentTrack = null;
    broadcast();
    return getStatusPayload();
};

const broadcastPlaylist = () => {
    if (broadcastFn) {
        broadcastFn('playlist-update', getPlaylist());
    }
};

const getPlaylist = () => queue.songs.map((song, index) => ({
    ...song,
    order: index + 1
}));

const getCurrent = () => ({
    track: state.currentTrack,
    startTime: state.startTime
});

module.exports = {
    setBroadcast,
    getStatus,
    getQueue,
    setMode,
    setSpeaker,
    setSong,
    addSongToQueue,
    removeSongFromQueue,
    addSpeakerToQueue,
    selectSongFromQueue,
    selectSpeakerFromQueue,
    getPlaylist,
    getCurrent
};
