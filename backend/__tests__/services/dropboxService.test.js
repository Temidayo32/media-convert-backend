const { getDropboxFileStream } = require('../../services/dropboxService');

console.error = jest.fn();
console.log = jest.fn();

describe('getDropboxFileStream', () => {
  test('should return the correct download link for Dropbox preview link', async () => {
    // Define a sample Dropbox preview link
    const dropboxPreviewLink = 'https://www.dropbox.com/s/example-preview-link';

    // Define the expected download link after conversion
    const expectedDownloadLink = 'https://www.dropbox.com/s/example-preview-link?dl=1';

    // Call the function with the Dropbox preview link
    const actualDownloadLink = await getDropboxFileStream(dropboxPreviewLink);

    // Assert that the actual download link matches the expected download link
    expect(actualDownloadLink).toEqual(expectedDownloadLink);
  });
});
