// background.js: Manifest V3 Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('YT Downloader Extension Installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download' && request.url) {
    handleDownload(request.url, request.format, sendResponse);
    return true; 
  }
  return false;
});

async function handleDownload(url, format, sendResponse) {
  try {
    // Pass format as a query parameter to the API
    const result = await fetch(`http://localhost:4000?url=${encodeURIComponent(url)}&format=${format}`, { 
      method: "POST" 
    });

    if (result.ok) {
      sendResponse({ status: 'success', message: `${format} installed` });
    } else {
      const errorData = await result.json().catch(() => ({}));
      sendResponse({ status: 'fail', message: errorData.error || 'failed to install' });
    }
  } catch (error) {
    console.error('Fetch error:', error);
    sendResponse({ status: 'error', message: 'failed to connect to server' });
  }
}
