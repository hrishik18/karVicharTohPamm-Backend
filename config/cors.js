const getCorsOrigins = () => {
    return process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
        : ['http://localhost:3000', 'http://localhost:5173'];
};

module.exports = { getCorsOrigins };
