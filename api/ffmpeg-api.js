import { YtDlp } from 'ytdlp-nodejs';
import { createWriteStream } from 'fs';
import http from 'http';

const ytdlp = new YtDlp();

const download = async (filename, format, videoLink)=> {
  console.log(`Starting download: ${filename} as ${format}`);
  const options = format === 'mp3' 
    ? { extractAudio: true, audioFormat: 'mp3' } 
    : { format: 'bestvideo+bestaudio/best', mergeOutputFormat: 'mp4' };

  const stream = ytdlp.stream(videoLink, options);

  stream.on('progress', (progress) => {
    console.log(`[${format.toUpperCase()}] ${filename} | Speed: ${progress.speed} | ETA: ${progress.eta}s`);
  });

  stream.on('error', (err) => {
    console.error('Stream Error:', err);
  });

  await stream.pipeAsync(createWriteStream(filename));
  console.log(`Finished: ${filename}`);
}

const downloadMedia = async (videoLink, format, res) => {
  let errorMessage = "Unkown error";
  let ok = true;

  try {
    let targetLink = videoLink;
    if (targetLink.includes('list=')) {
      const urlObj = new URL(targetLink);
      const playlistId = urlObj.searchParams.get('list');
      console.log("[+] Playlist ID: " + playlistId);
      targetLink = `https://www.youtube.com/playlist?list=${playlistId}`;
    }

    let info = null;
    try {
      info = await ytdlp.getInfoAsync(targetLink);
    } catch (error) {
      errorMessage = error.message;
      if (errorMessage.search("403")) {
        console.error("[!] Private playlist");
        errorMessage = "Private playlist";
      } 

      ok = false;
      throw errorMessage;
    }

    // check if its a playlist
    let isPlaylist = false;
    if (info._type === 'playlist' || info.entries) {
      console.log("[+] Link is a playlist")
      console.log(`Total videos in playlist: ${info.entries.length}`);
      isPlaylist = true;
    } else console.log("[+] Not a playlist");

    // if everything is ok, start downloading
    if (ok) {
      const cleanTitle = info.title.replace(/[^\w\s-]/gi, ''); // Remove special chars for safe filename
      const filename = `${cleanTitle}.${format}`;

      if (isPlaylist) {
        info.entries.forEach((video, index) => {
          // console.log(`[Video #${index + 1}]`);
          // console.log(`Title: ${video.title}`);
          // console.log(`Video ID: ${video.id}`);
          let url = `https://www.youtube.com/watch?v=${video.id}`;
          let fileFormat = video.title + "." + format;
          download(fileFormat, format, url);
        });
      } else {
        download(filename, format, targetLink);
      }

      res.writeHead(200);
      res.end(JSON.stringify({ 
        status: 200,
        message: 'ok', 
        file: filename,
        url: videoLink 
      }));
    }

  } catch (error) {
    console.error('Process Error:', error);
    if (!res.writableEnded) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to process download: \n' + errorMessage}));
    }
  }
};

const server = http.createServer((req, res) => {
  const { method, url } = req;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*'); // For development

  if (method === 'POST') {
    const fullUrl = new URL(url, `http://${req.headers.host}`);
    const videoLink = fullUrl.searchParams.get('url');
    const format = fullUrl.searchParams.get('format') || 'mp3';

    if (!videoLink) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'Missing url parameter' }));
    }

    console.log(`New request: ${videoLink} [Format: ${format}]`);
    downloadMedia(videoLink, format, res);
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Route not found' }));
  }
});

server.listen(4000, () => console.log('Downloader API running on port 4000'));
