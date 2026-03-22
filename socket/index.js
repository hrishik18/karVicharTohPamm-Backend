const { Server } = require('socket.io');
const radioService = require('../modules/radio/radio.service');
const { getCorsOrigins } = require('../config/cors');

const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: getCorsOrigins(),
            methods: ['GET', 'POST']
        }
    });

    // Wire up broadcast: radio service calls this on every state change
    radioService.setBroadcast((event, payload) => {
        io.emit(event, payload);
    });

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Send current state on connect
        socket.emit('status-update', radioService.getStatus());

        // Client reports that a song finished playing
        socket.on('song-ended', (data) => {
            const id = data && typeof data.id === 'string' ? data.id : null;
            if (!id) return;
            radioService.advanceToNextSong(id).catch(err =>
                console.error('song-ended handler error:', err.message)
            );
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

module.exports = { initSocket };
