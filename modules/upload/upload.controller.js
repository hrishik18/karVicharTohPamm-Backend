const uploadService = require('./upload.service');

exports.uploadFile = async (req, res) => {
    console.log('[upload.controller] uploadFile hit');
    console.log('[upload.controller] req.file:', req.file ? { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } : 'NO FILE');
    try {
        if (!req.file) {
            console.warn('[upload.controller] no file in request');
            return res.status(400).json({ message: 'No file provided' });
        }
        const url = await uploadService.uploadToBlob(req.file);
        console.log('[upload.controller] upload done, url:', url);
        res.json({ message: 'Upload successful', url });
    } catch (error) {
        console.error('[upload.controller] ERROR:', error.message);
        res.status(500).json({ message: error.message });
    }
};
