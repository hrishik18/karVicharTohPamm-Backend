// server.js
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const streamRoutes = require('./routes/stream');
const { protect } = require('./middleware/auth');
const { publicRouter: radioPublicRoutes, adminRouter: radioAdminRoutes } = require('./modules/radio/radio.routes');
const uploadRoutes = require('./modules/upload/upload.routes');
const { initSocket } = require('./socket/index');
const { getCorsOrigins } = require('./config/cors');

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS
app.use(cors({ origin: getCorsOrigins() }));
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Existing routes
app.get('/', (req, res) => res.send('API is running'));
app.use('/api/auth', authRoutes);
app.use('/api/stream', streamRoutes);

// Existing admin routes (protected)
app.use('/api/admin', protect, require('./routes/admin'));

// Radio public routes (no auth)
app.use('/api/radio', radioPublicRoutes);

// Radio admin routes (protected)
app.use('/api/admin', protect, radioAdminRoutes);

// Upload admin route (protected)
app.use('/api/admin/upload', protect, uploadRoutes);

// Initialize Socket.io
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
