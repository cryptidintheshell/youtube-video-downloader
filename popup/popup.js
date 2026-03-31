let videoURL;

document.addEventListener('DOMContentLoaded', () => {
  const downloadButton = document.getElementById('downloadButton');
  const videoTitleLabel = document.getElementById('videoTitle');
  const statusLabel = document.getElementById('status');

  const updateStatus = (text, type) => {
    statusLabel.innerText = text;
    statusLabel.className = type ? `status-${type}` : '';
  };

  chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
    const activeTab = tabs[0];
    if (!activeTab || !activeTab.url) {
      updateStatus("No active tab found", "error");
      return;
    }
    
    videoURL = activeTab.url;

    if (videoURL.includes("youtube.com/watch")) {
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          const el = document.querySelector('yt-formatted-string.ytd-watch-metadata');
          return el ? el.innerText : document.title;
        }
      }, (results) => {
        if (chrome.runtime.lastError) {
          videoTitleLabel.innerText = "YouTube Video";
          return;
        }
        if (results && results[0]) {
          videoTitleLabel.innerText = results[0].result;
        }
      });
    } else {
      videoTitleLabel.innerText = "Not a YouTube video";
      downloadButton.disabled = true;
      updateStatus("Please open a YouTube video", "error");
    }
  });

  downloadButton.addEventListener('click', () => {
    const selectedFormat = document.querySelector('input[name="format"]:checked').value;
    
    if (!videoURL || !videoURL.includes("youtube.com/watch")) {
      updateStatus("Invalid YouTube URL", "error");
      return;
    }

    // Update UI for loading state
    downloadButton.disabled = true;
    downloadButton.innerText = "Downloading...";
    updateStatus("Processing your request...", "");

    chrome.runtime.sendMessage({ 
      action: 'download', 
      url: videoURL,
      format: selectedFormat
    }, (response) => {
      // Reset button state
      downloadButton.disabled = false;
      downloadButton.innerText = "Download Now";

      if (chrome.runtime.lastError) {
        updateStatus("Error: " + chrome.runtime.lastError.message, "error");
      } else if (response) {
        if (response.status === 'success') {
          updateStatus(`${selectedFormat.toUpperCase()} installed successfully!`, "success");
        } else {
          updateStatus(response.message || "Failed to download", "error");
        }
      }
    });
  });
});
