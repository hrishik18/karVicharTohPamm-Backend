const { BlobServiceClient } = require('@azure/storage-blob');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_CONTAINER_NAME || 'songs';

let containerReady = false;

async function ensureContainer(containerClient) {
    if (containerReady) return;
    await containerClient.createIfNotExists({ access: 'blob' });
    containerReady = true;
}

exports.uploadToBlob = async (file) => {
    console.log('[upload.service] uploadToBlob called');
    console.log('[upload.service] file:', { originalname: file.originalname, mimetype: file.mimetype, size: file.buffer?.length });
    console.log('[upload.service] connectionString set:', !!connectionString);
    console.log('[upload.service] containerName:', containerName);

    if (!connectionString) {
        console.error('[upload.service] ERROR: AZURE_STORAGE_CONNECTION_STRING is not configured');
        throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Ensure container exists with blob-level public access (so audio URLs are playable)
    await ensureContainer(containerClient);

    const ext = path.extname(file.originalname) || '.mp3';
    const blobName = `${uuidv4()}${ext}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    console.log('[upload.service] uploading blob:', blobName, 'size:', file.buffer.length, 'bytes');

    await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: { blobContentType: file.mimetype },
    });

    console.log('[upload.service] upload SUCCESS, url:', blockBlobClient.url);
    return blockBlobClient.url;
};
