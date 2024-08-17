exports.getStreamStatus = async (req, res) => {
    // Replace with actual logic to determine if the stream is live
    const isLive = determineIfLive();
    res.json({
        isLive,
        streamUrl: process.env.STREAM_URL
    });
};

const determineIfLive = () => {
    const now = new Date();
    const day = now.getUTCDay();
    const hour = now.getUTCHours();

    // Assuming the stream is live every Sunday from 8 AM to 11 AM UTC
    return day === 0 && hour >= 8 && hour < 11;
};
