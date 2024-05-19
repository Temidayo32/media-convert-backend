const { Dropbox } = require('dropbox');
const stream = require('stream');
require('dotenv').config();

// const dropbox = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });

function convertPreviewToDownloadLink(previewLink) {
    const url = new URL(previewLink);
    url.searchParams.set('dl', '1');
    return url.toString();
}


async function getDropboxFileStream(dropboxPath) {
    const downloadLink = convertPreviewToDownloadLink(dropboxPath);
    // const response = await dropbox.filesDownload({ path: downloadLink });
    // const bufferStream = new stream.PassThrough();
    // bufferStream.end(response.result.fileBinary);
    return downloadLink;
}

module.exports = { getDropboxFileStream };
