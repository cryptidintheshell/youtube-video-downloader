import { YtDlp } from 'ytdlp-nodejs';
import { createWriteStream } from 'fs';
import http from 'http';

const ytdlp = new YtDlp();

const downloadMedia = async (videoLink, format, res) => {
  try {
    const info = await ytdlp.getInfoAsync(videoLink); 
    const cleanTitle = info.title.replace(/[^\w\s-]/gi, ''); // Remove special chars for safe filename
    const filename = `${cleanTitle}.${format}`;
    
    console.log(`Starting download: ${filename} as ${format}`);

    const options = format === 'mp3' 
      ? { extractAudio: true, audioFormat: 'mp3' } 
      : { format: 'bestvideo+bestaudio/best', mergeOutputFormat: 'mp4' };

    const stream = ytdlp.stream(videoLink, options);

    stream.on('progress', (progress) => {
      console.log(`[${format.toUpperCase()}] ${progress.percent}% | Speed: ${progress.speed} | ETA: ${progress.eta}s`);
    });

    stream.on('error', (err) => {
      console.error('Stream Error:', err);
    });

    await stream.pipeAsync(createWriteStream(filename));
    
    console.log(`Finished: ${filename}`);
    
    res.writeHead(200);
    res.end(JSON.stringify({ 
      status: 200,
      message: 'ok', 
      file: filename,
      url: videoLink 
    }));

  } catch (error) {
    console.error('Process Error:', error);
    if (!res.writableEnded) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Failed to process download' }));
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
