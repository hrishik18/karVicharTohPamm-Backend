// Placeholder — full Azure Blob Storage implementation later
// Will use @azure/storage-blob to upload files

exports.uploadToBlob = async (file) => {
    // TODO: Implement Azure Blob Storage upload
    // 1. Initialize BlobServiceClient from AZURE_STORAGE_CONNECTION_STRING
    // 2. Get container client using AZURE_CONTAINER_NAME
    // 3. Generate unique blob name: <uuid>.<original-extension>
    // 4. Upload file buffer via blockBlobClient.uploadData()
    // 5. Set blobHTTPHeaders.blobContentType to the file's MIME type
    // 6. Return blockBlobClient.url
    throw new Error('Upload not implemented yet');
};
