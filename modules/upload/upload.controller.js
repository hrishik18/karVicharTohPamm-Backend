const uploadService = require('./upload.service');

exports.uploadFiles = async (req, res) => {
    console.log('[upload.controller] uploadFiles hit, file count:', req.files?.length);
    try {
        if (!req.files || req.files.length === 0) {
            console.warn('[upload.controller] no files in request');
            return res.status(400).json({ message: 'No files provided' });
        }
        const results = [];
        for (const file of req.files) {
            console.log('[upload.controller] uploading:', file.originalname);
            const url = await uploadService.uploadToBlob(file);
            results.push({ originalName: file.originalname, url });
        }
        console.log('[upload.controller] all uploads done, count:', results.length);
        res.json({ message: 'Upload successful', results });
    } catch (error) {
        console.error('[upload.controller] ERROR:', error.message);
        res.status(500).json({ message: error.message });
    }
};
