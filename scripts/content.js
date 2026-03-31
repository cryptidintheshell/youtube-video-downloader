console.log('Brave Extension Template Content Script Loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'changeBackgroundColor') {
    document.body.style.backgroundColor = request.color;
    sendResponse({ status: 'done' });
  }
});
