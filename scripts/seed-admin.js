/**
 * Seed admin user — run once to create the admin account.
 *
 * Usage:
 *   node scripts/seed-admin.js
 *
 * Reads ADMIN_EMAIL, ADMIN_PASSWORD, and MONGO_URI from .env
 */
const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const User = require('../models/User');

async function seed() {
    const { MONGO_URI, MONGO_URI_DEV, NODE_ENV, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
    const mongoUri = NODE_ENV === 'production' ? MONGO_URI : (MONGO_URI_DEV || MONGO_URI);

    if (!mongoUri || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
        console.error('Missing MONGO_URI/MONGO_URI_DEV, ADMIN_EMAIL, or ADMIN_PASSWORD in .env');
        process.exit(1);
    }

    console.log(`Environment: ${NODE_ENV || 'not set'}, DB: ${mongoUri.split('/').pop()}`);
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
        console.log(`Admin user "${ADMIN_EMAIL}" already exists — skipping.`);
    } else {
        await User.create({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        console.log(`Admin user "${ADMIN_EMAIL}" created successfully.`);
    }

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
