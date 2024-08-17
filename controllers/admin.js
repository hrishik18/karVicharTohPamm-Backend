exports.startStream = async (req, res) => {
    // Logic to start the stream
    res.json({ message: 'Stream started' });
};

exports.stopStream = async (req, res) => {
    // Logic to stop the stream
    res.json({ message: 'Stream stopped' });
};

// Add stream volume and ... other controllers 