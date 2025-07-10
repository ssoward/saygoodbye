/**
 * Utility functions for downloading files in the browser
 */

/**
 * Downloads a file from a blob response
 * @param {Blob} blob - The blob data to download
 * @param {string} filename - The filename for the download
 */
export const downloadBlob = (blob, filename) => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof globalThis.document === 'undefined') {
    throw new Error('Download not available in this environment');
  }

  const url = window.URL.createObjectURL(blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  globalThis.document.body.appendChild(link);
  link.click();
  
  // Clean up
  globalThis.document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Downloads a file from an API response
 * @param {Object} response - Axios response with blob data
 * @param {string} filename - The filename for the download
 */
export const downloadFromResponse = (response, filename) => {
  const blob = new Blob([response.data]);
  downloadBlob(blob, filename);
};

/**
 * Safe wrapper for downloading files with error handling
 * @param {Function} downloadFn - Function that performs the download
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
export const safeDownload = async (downloadFn, onSuccess, onError) => {
  try {
    await downloadFn();
    if (onSuccess) onSuccess();
  } catch (error) {
    console.error('Download error:', error);
    if (onError) onError(error);
  }
};
