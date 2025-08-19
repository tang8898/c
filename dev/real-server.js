// Real downloader server with yt-dlp and ffmpeg integration
const http = require('http');
const socketio = require('socket.io');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 增加静态文件服务支持
const url = require('url');
const mime = require('mime-types') || null;

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;
  
  // 尝试提供静态文件服务（对于 Web 界面）
  if (req.method === 'GET' && pathname !== '/socket.io/') {
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    
    // 安全检查：确保文件在当前目录内
    if (!path.resolve(filePath).startsWith(path.resolve(__dirname))) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      let contentType = 'text/plain';
      
      // 简单的 MIME 类型映射
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml'
      };
      
      if (mimeTypes[ext]) {
        contentType = mimeTypes[ext];
      } else if (mime && mime.lookup) {
        contentType = mime.lookup(filePath) || 'text/plain';
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  }
  
  // 默认 Socket.IO 服务器响应
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Video Downloader Socket.IO server is running');
});

const io = socketio(server, {
  cors: {
    origin: '*',
  },
});

// 配置路径
const YTDLP_PATH = path.join(__dirname, 'bin', 'yt-dlp.exe');
const FFMPEG_PATH = path.join(__dirname, '..', 'BB', 'windows', 'ffmpeg', 'ffmpeg.exe');
const DOWNLOAD_DIR = path.join(__dirname, '..', 'download');

// 确保下载目录存在
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// 新增：当前下载目录（可通过前端设置覆盖）
let CURRENT_DOWNLOAD_DIR = DOWNLOAD_DIR;
function ensureDir(dir) {
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
}
function getDownloadDir() {
  ensureDir(CURRENT_DOWNLOAD_DIR);
  return CURRENT_DOWNLOAD_DIR;
}

// 活跃的下载任务
const activeTasks = new Map();

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  // === 哔哩哔哩解析 ===
  socket.on('Bili_Parse', async (payload) => {
    console.log('Bili_Parse received:', payload);
    
    if (!payload?.url) {
      socket.emit('Bili_Parse_Result', { err: '请提供有效的B站视频链接' });
      return;
    }

    // 清理和验证 URL
    let cleanUrl = payload.url.trim();
    
    // 提取纯净的 URL，移除可能的描述文本
    const urlMatch = cleanUrl.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      cleanUrl = urlMatch[1];
    }
    // 去除包裹字符与结尾多余符号
    cleanUrl = cleanUrl
      .replace(/^[`'"“”‘’「」『』【】\[\]\(\)<>]+/, '')
      .replace(/[`'"“”‘’「」『』【】\[\]\(\)<>，。、《》、]+$/, '');
    // 常见域名错拼纠正
    cleanUrl = cleanUrl.replace('bilibili.coom', 'bilibili.com').replace('bbilibili.com', 'bilibili.com');
    
    // 验证是否为有效的 B站 URL
    if (!cleanUrl.includes('bilibili.com') && !cleanUrl.includes('b23.tv')) {
      socket.emit('Bili_Parse_Result', { err: '请输入有效的B站视频链接' });
      return;
    }
    
    console.log('Clean URL:', cleanUrl);

    try {
      // 使用 yt-dlp 获取视频信息
      const args = [
        '--dump-json',
        '--no-download',
        ...commonYtdlpArgs(),
        cleanUrl
      ];

      const ytdlp = spawn(YTDLP_PATH, args, {
        cwd: getDownloadDir(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      ytdlp.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ytdlp.on('close', (code) => {
        if (code !== 0) {
          console.error('yt-dlp error:', stderr);
          socket.emit('Bili_Parse_Result', { 
            err: '解析失败，请检查链接是否正确或网络连接' 
          });
          return;
        }

        try {
          const info = JSON.parse(stdout);
          
          // 提取可用格式
          const formats = info.formats || [];
          const videoFormats = formats.filter(f => f.vcodec && f.vcodec !== 'none');
          const audioFormats = formats.filter(f => f.acodec && f.acodec !== 'none');

          // 生成质量选项
          const qualities = [];
          const resolutions = ['1080', '720', '480', '360'];
          
          for (const res of resolutions) {
            const format = videoFormats.find(f => f.height && f.height >= parseInt(res));
            if (format) {
              qualities.push({
                value: `${res}p`,
                label: `${res}P ${format.ext?.toUpperCase() || 'MP4'}`
              });
            }
          }

          if (qualities.length === 0) {
            qualities.push({ value: 'best', label: '最佳质量' });
          }

          const result = {
            title: info.title || '未知标题',
            author: info.uploader || info.channel || '未知UP主',
            duration: formatDuration(info.duration),
            view: formatNumber(info.view_count),
            cover: info.thumbnail || '',
            qualities: qualities,
            _raw: info // 保存原始信息供下载使用
          };

          socket.emit('Bili_Parse_Result', { err: null, data: result });
        } catch (parseErr) {
          console.error('JSON parse error:', parseErr);
          socket.emit('Bili_Parse_Result', { 
            err: '解析视频信息失败' 
          });
        }
      });

    } catch (error) {
      console.error('Bili_Parse error:', error);
      socket.emit('Bili_Parse_Result', { 
        err: '服务器错误，请稍后重试' 
      });
    }
  });

  // === 哔哩哔哩下载 ===
  socket.on('Bili_Download', async (payload) => {
    console.log('Bili_Download:', payload);
    
    if (!payload?.url || !payload?.meta) {
      socket.emit('Bili_Download_Done', { err: '缺少必要的下载参数' });
      return;
    }

    const taskId = uuidv4();
    const { url, vq, aq, type, audioFormat, meta } = payload;
    const audioFmt = (audioFormat || 'mp3').toLowerCase();
    // 将UI的音频质量映射至yt-dlp参数（kbps）
    const audioQualityMap = { '320k': '320K', '192k': '192K', '128k': '128K' };
    const audioQ = audioQualityMap[aq] || '192K';

    // 清理和验证 URL（与解析一致）
    let cleanUrl = (url || '').trim();
    const urlMatch = cleanUrl.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      cleanUrl = urlMatch[1];
    }
    cleanUrl = cleanUrl.replace('bilibili.coom', 'bilibili.com').replace('bbilibili.com', 'bilibili.com');
    if (!cleanUrl.includes('bilibili.com') && !cleanUrl.includes('b23.tv')) {
      socket.emit('Bili_Download_Done', { err: '无效的B站下载链接' });
      return;
    }
    
    try {
      // 构建下载参数
      const height = (vq?.replace('p', '') || '1080');
      const args = [cleanUrl];
      // 将通用头参数置于最前
      args.unshift(...commonYtdlpArgs());
      
      // 根据选择的质量和类型设置格式
      if (type === 'video') {
        // 优先选择 mp4 容器的视频轨 + m4a 音频轨，退化为任意容器的视频+音频，再退化为 best
        args.push('-f', `bv*[height<=${height}][ext=mp4]+ba[ext=m4a]/bv*[height<=${height}]+ba/best`);
      } else if (type === 'audio') {
        args.push('-f', 'bestaudio/best');
        args.push('--extract-audio', '--audio-format', audioFmt);
        if (audioQ) {
          args.push('--audio-quality', audioQ);
        }
      } else {
        // 默认下载视频+音频，带分辨率限制
        args.push('-f', `bv*[height<=${height}]+ba/best`);
      }

      // 输出模板
      const filename = sanitizeFilename(`${meta.title || 'video'}.%(ext)s`);
      args.push('-o', path.join(getDownloadDir(), filename));

      // 添加进度报告
      args.push('--newline');
      // 指定 ffmpeg 路径
      args.push('--ffmpeg-location', path.dirname(FFMPEG_PATH));
      // 强制合并为 mp4（若可能），仅在需要合并为视频容器时设置
      if (type !== 'audio') {
        args.push('--merge-output-format', 'mp4');
      }
      // 设置 UA 和 Referer，提升 B站可访问性
      args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
      args.push('--add-header', 'Referer:https://www.bilibili.com');

      const ytdlp = spawn(YTDLP_PATH, args, {
        cwd: getDownloadDir(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      activeTasks.set(taskId, ytdlp);

      let lastProgress = 0;
      
      ytdlp.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('yt-dlp output:', output);
        
        // 解析进度信息
        const progressMatch = output.match(/(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          if (progress > lastProgress) {
            lastProgress = progress;
            
            // 解析速度信息
            const speedMatch = output.match(/(\d+\.?\d*\w*\/s)/);
            const etaMatch = output.match(/ETA (\d+:\d+)/);
            
            socket.emit('Bili_Download_Progress', {
              percent: Math.round(progress),
              speed: speedMatch ? speedMatch[1] : '计算中...',
              eta: etaMatch ? etaMatch[1] : '计算中...',
              file: (type === 'audio') ? filename.replace('.%(ext)s', `.${audioFmt}`) : filename.replace('.%(ext)s', '.mp4')
            });
          }
        }
      });

      ytdlp.stderr.on('data', (data) => {
        console.error('yt-dlp stderr:', data.toString());
      });

      ytdlp.on('close', (code) => {
        activeTasks.delete(taskId);
        
        if (code === 0) {
          // 查找下载的文件
          const files = fs.readdirSync(getDownloadDir());
          const prefix = sanitizeFilename(`${meta.title || 'video'}`);
          const downloadedFile = files.find(f => f.includes(prefix));
          
          socket.emit('Bili_Download_Done', {
            err: null,
            file: downloadedFile || 'download_completed.mp4',
            path: getDownloadDir()
          });
        } else {
          socket.emit('Bili_Download_Done', {
            err: '下载失败，请检查网络连接或视频可用性'
          });
        }
      });

    } catch (error) {
      console.error('Bili_Download error:', error);
      socket.emit('Bili_Download_Done', {
        err: '下载启动失败：' + error.message
      });
    }
  });

  // === 抖音解析 ===
  socket.on('Douyin_Parse', async (payload) => {
    try {
      let cleanUrl = (payload?.url||'').trim();
      const m = cleanUrl.match(/(https?:\/\/[^\s]+)/);
      if (m) cleanUrl = m[1];
      cleanUrl = cleanUrl
        .replace(/^[`'"“”‘’「」『』【】\[\]\(\)<>]+/, '')
        .replace(/[`'"“”‘’「」『』【】\[\]\(\)<>，。、《》、]+$/, '');
      if (!cleanUrl.includes('douyin.com') && !cleanUrl.includes('iesdouyin.com')) {
        socket.emit('Douyin_Parse_Result', { err: '请输入有效的抖音链接' });
        return;
      }

      const args = [ '--dump-json', '--no-download', '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', '--add-header', 'Referer:https://www.douyin.com', cleanUrl ];
      const ytdlp = spawn(YTDLP_PATH, args, { cwd: getDownloadDir(), stdio: ['pipe','pipe','pipe'] });
      let stdout = '', stderr = '';
      ytdlp.stdout.on('data', d=> stdout += d.toString());
      ytdlp.stderr.on('data', d=> stderr += d.toString());
      ytdlp.on('close', (code)=>{
        if (code !== 0) {
          console.error('Douyin yt-dlp parse error:', stderr);
          socket.emit('Douyin_Parse_Result', { err: '解析失败，请检查链接是否正确或网络连接' });
          return;
        }
        try {
          let info = null;
          try {
            info = JSON.parse(stdout);
          } catch (e1) {
            // Fallback: 有些情况下会输出多行 JSON 或混入换行，尝试逐行解析
            const lines = stdout.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
            for (const ln of lines) {
              try { info = JSON.parse(ln); break; } catch(e2) {}
            }
          }
          if (!info) throw new Error('No JSON parsed');
          const data = {
            title: info.title || '未知标题',
            author: info.uploader || info.channel || '-',
            cover: info.thumbnail || '',
            url: cleanUrl
          };
          socket.emit('Douyin_Parse_Result', { err: null, data });
        } catch (e) {
          socket.emit('Douyin_Parse_Result', { err: '解析数据格式错误' });
        }
      });
    } catch (e) {
      socket.emit('Douyin_Parse_Result', { err: '解析异常：' + e.message });
    }
  });

  // === 抖音下载 ===
  socket.on('Douyin_Download', async (payload) => {
    console.log('Douyin_Download:', payload);
    
    if (!payload?.url) {
      socket.emit('Douyin_Download_Done', { err: '缺少下载链接' });
      return;
    }

    const taskId = uuidv4();

    // 清理并验证 URL
    let cleanUrl = (payload.url || '').trim();
    const urlMatch2 = cleanUrl.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch2) {
      cleanUrl = urlMatch2[1];
    }
    if (!cleanUrl.includes('douyin.com') && !cleanUrl.includes('iesdouyin.com')) {
      socket.emit('Douyin_Download_Done', { err: '无效的抖音下载链接' });
      return;
    }
    
    try {
      const type = payload.type || 'video';
      const audioFmt = (payload.audioFormat || 'mp3').toLowerCase();
      const aq = payload.aq || '192k';

      let args = [ cleanUrl, '--newline', '--ffmpeg-location', path.dirname(FFMPEG_PATH), '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', '--add-header', 'Referer:https://www.douyin.com' ];
      let outTemplate = '抖音_%(title)s.%(ext)s';

      if (type === 'audio') {
        // 仅音频
        args.push('-f', 'ba/best');
        args.push('-x', '--audio-format', audioFmt, '--audio-quality', aq);
        outTemplate = `抖音_%(title)s.${audioFmt}`; // 直接输出音频后缀
      } else if (type === 'both') {
        // 视频+音频合并为mp4
        args.push('-f', 'bv*+ba/best');
        args.push('--merge-output-format', 'mp4');
        outTemplate = '抖音_%(title)s.mp4';
      } else {
        // 仅视频
        args.push('-f', 'bv*/bestvideo');
        args.push('--merge-output-format', 'mp4');
        outTemplate = '抖音_%(title)s.mp4';
      }

      args.push('-o', path.join(getDownloadDir(), outTemplate));

      const ytdlp = spawn(YTDLP_PATH, args, {
        cwd: getDownloadDir(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      activeTasks.set(taskId, ytdlp);

      let lastProgress = 0;
      
      ytdlp.stdout.on('data', (data) => {
        const output = data.toString();
        
        const progressMatch = output.match(/(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = parseFloat(progressMatch[1]);
          if (progress > lastProgress) {
            lastProgress = progress;
            
            const speedMatch = output.match(/(\d+\.?\d*\w*\/s)/);
            
            socket.emit('Douyin_Download_Progress', {
              percent: Math.round(progress),
              speed: speedMatch ? speedMatch[1] : '计算中...'
            });
          }
        }
      });

      ytdlp.stderr.on('data', (data) => {
        console.error('Douyin yt-dlp stderr:', data.toString());
      });

      ytdlp.on('close', (code) => {
        activeTasks.delete(taskId);
        
        if (code === 0) {
          const files = fs.readdirSync(getDownloadDir());
          const prefix = '抖音_';
          const downloadedFile = files.find(f => f.includes(prefix));
          
          socket.emit('Douyin_Download_Done', {
            err: null,
            file: downloadedFile || (type==='audio' ? `抖音_音频.${audioFmt}` : 'douyin_video.mp4'),
            path: getDownloadDir()
          });
        } else {
          socket.emit('Douyin_Download_Done', {
            err: '下载失败，请检查网络连接'
          });
        }
      });

    } catch (error) {
      console.error('Douyin_Download error:', error);
      socket.emit('Douyin_Download_Done', {
        err: '下载启动失败：' + error.message
      });
    }
  });

  // === 设置：自定义下载目录 ===
  socket.on('Set_Download_Dir', (payload) => {
    try {
      const dir = (payload && typeof payload.downloadDir === 'string') ? payload.downloadDir.trim() : '';
      if (!dir) {
        CURRENT_DOWNLOAD_DIR = DOWNLOAD_DIR; // 恢复默认
        console.log('Download dir reset to default:', CURRENT_DOWNLOAD_DIR);
        return;
      }
      // 解析为绝对路径
      let resolved = dir;
      try { resolved = path.resolve(dir); } catch (e) {}
      CURRENT_DOWNLOAD_DIR = resolved;
      ensureDir(CURRENT_DOWNLOAD_DIR);
      console.log('Download dir set to:', CURRENT_DOWNLOAD_DIR);
    } catch (e) {
      console.error('Set_Download_Dir error:', e.message);
      CURRENT_DOWNLOAD_DIR = DOWNLOAD_DIR;
    }
  });

  // 新增：获取当前下载目录
  socket.on('Get_Download_Dir', () => {
    try {
      socket.emit('Get_Download_Dir_Result', { err: null, downloadDir: getDownloadDir() });
    } catch (e) {
      socket.emit('Get_Download_Dir_Result', { err: e.message });
    }
  });

  // === 云端硬盘功能 ===
  const CLOUD_DIR = path.join(__dirname, '..', 'cloud_storage');
  if (!fs.existsSync(CLOUD_DIR)) {
    fs.mkdirSync(CLOUD_DIR, { recursive: true });
  }

  socket.on('Cloud_List', () => {
    try {
      const files = fs.readdirSync(CLOUD_DIR).map(filename => {
        const filePath = path.join(CLOUD_DIR, filename);
        const stats = fs.statSync(filePath);
        return {
          name: filename,
          size: stats.size,
          modified: stats.mtime.toISOString()
        };
      });
      
      socket.emit('Cloud_List_Result', { err: null, files });
    } catch (error) {
      socket.emit('Cloud_List_Result', { err: '读取文件列表失败' });
    }
  });

  socket.on('Cloud_Upload_Chunk', (payload) => {
    try {
      const { name, offset } = payload || {};
      if(!name || typeof offset !== 'number'){
        socket.emit('Cloud_Upload_Ack', { status: 'error', error: '参数不正确' });
        return;
      }
      const filePath = path.join(CLOUD_DIR, name);

      // 构造 buffer，兼容 base64 chunk 与 数组 data 两种形式
      let buffer = Buffer.alloc(0);
      if (Array.isArray(payload.data)) {
        buffer = Buffer.from(Uint8Array.from(payload.data));
      } else if (typeof payload.chunk === 'string') {
        try { buffer = Buffer.from(payload.chunk, 'base64'); } catch (e) { buffer = Buffer.alloc(0); }
      }

      const flag = offset === 0 ? 'w' : 'a';
      fs.writeFileSync(filePath, buffer, { flag });
      
      socket.emit('Cloud_Upload_Ack', { status: 'ok', received: offset + buffer.length });
    } catch (error) {
      socket.emit('Cloud_Upload_Ack', { status: 'error', error: error.message });
    }
  });

  socket.on('Cloud_Upload_Done', (payload) => {
    socket.emit('Cloud_Upload_Done_Result', { err: null });
  });

  socket.on('Cloud_Download', (payload) => {
    try {
      const filePath = path.join(CLOUD_DIR, payload.name);
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath);
        socket.emit('Cloud_Download_Result', { 
          err: null, 
          data: fileData.toString('base64'),
          name: payload.name
        });
      } else {
        socket.emit('Cloud_Download_Result', { err: '文件不存在' });
      }
    } catch (error) {
      socket.emit('Cloud_Download_Result', { err: '下载失败：' + error.message });
    }
  });

  socket.on('Cloud_Delete', (payload) => {
    try {
      const filePath = path.join(CLOUD_DIR, payload.name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        socket.emit('Cloud_Delete_Result', { err: null });
      } else {
        socket.emit('Cloud_Delete_Result', { err: '文件不存在' });
      }
    } catch (error) {
      socket.emit('Cloud_Delete_Result', { err: '删除失败：' + error.message });
    }
  });

  // 保持兼容性的事件处理
  socket.on('Get_Browser_HTML', async (payload, ack) => {
    const response = { status: 200, list: [] };
    if (typeof ack === 'function') ack(response);
    else socket.emit('Get_Browser_HTML_Done', response);
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', reason);
    // 清理该客户端的活跃任务
    for (const [taskId, process] of activeTasks.entries()) {
      if (process && !process.killed) {
        process.kill();
        activeTasks.delete(taskId);
      }
    }
  });
});

// 工具函数
function formatDuration(seconds) {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
  if (!num) return '-';
  if (num > 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

function sanitizeFilename(filename) {
  return filename.replace(/[<>:"/\\|?*]/g, '_');
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 20427;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Video Downloader Socket.IO server listening on http://${HOST}:${PORT}`);
});
// 将日志中的 PeanutDL 或站点字样替换为通用描述
console.log(`[Server] Ready. Use the web UI to parse and download videos.`);

// ... existing code ...
const YTDLP_PATH = path.join(__dirname, 'bin', 'yt-dlp.exe');
// 启动时尝试自更新 yt-dlp（容器环境下为可写二进制，若无则忽略）
try {
  if (fs.existsSync(YTDLP_PATH)) {
    exec(`"${YTDLP_PATH}" -U`, (err, stdout, stderr) => {
      if (err) {
        console.warn('[yt-dlp] self-update failed (ignored):', err.message);
      } else {
        console.log('[yt-dlp] self-update:', (stdout || '').toString().trim());
        if (stderr) console.log('[yt-dlp] self-update stderr:', stderr.toString().trim());
      }
    });
  }
} catch (e) {
  console.warn('[yt-dlp] self-update exception (ignored):', e.message);
}