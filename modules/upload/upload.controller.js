// Placeholder — full implementation later
const uploadService = require('./upload.service');

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }
        const url = await uploadService.uploadToBlob(req.file);
        res.json({ message: 'Upload successful', url });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
