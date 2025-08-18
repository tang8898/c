// Minimal mock Socket.IO server compatible with the renderer and main process expectations
const http = require('http');
const socketio = require('socket.io');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Mock Socket.IO server is running');
});

const io = socketio(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  // The main process listens for specific events. We implement minimal handlers/replies.
  // 1) Notify connection status for UI
  io.emit('connect');

  // 2) Respond to Get_Browser_HTML batch jobs
  socket.on('Get_Browser_HTML', async (payload, ack) => {
    try {
      // payload example observed in code: { url: ["https://..."], title: true, html: true }
      const urls = Array.isArray(payload?.url) ? payload.url : [];
      const results = urls.map((u) => ({ url: u, title: 'Mock Title', html: '<html><body>Mock</body></html>' }));
      const response = { status: 200, list: results };
      if (typeof ack === 'function') ack(response);
      else socket.emit('Get_Browser_HTML_Done', response);
    } catch (e) {
      const response = { status: 500, error: e.message };
      if (typeof ack === 'function') ack(response);
      else socket.emit('Get_Browser_HTML_Done', response);
    }
  });

  // 3) Minimal handlers for other events referenced in code (aliases and no-ops)
  const ok = (evt) => (data, ack) => {
    console.log('Received', evt, data);
    if (typeof ack === 'function') ack({ status: 200 });
  };
  // legacy aliases
  ['Set_User_Agent', 'Clear_Browser_Cache', 'Open_New_Window', 'Fetch.addListener', 'Fetch.removeListener'].forEach((evt) => {
    socket.on(evt, ok(evt));
  });
  // events used by main process and new web UI
  ['BrowserSetUA', 'clearCache', 'Get_Browser_OpenNewWindow', 'OpenURL', 'Set_Cookie', 'GetCookis', 'BrowserID'].forEach((evt) => {
    socket.on(evt, ok(evt));
  });
  // Provide a mock list of browser windows/tabs
  socket.on('Get_Browser_List', (payload, ack) => {
    const list = [
      { id: 'main-1', title: 'Mock Main Window', url: 'https://example.com' },
    ];
    const response = { status: 200, list };
    if (typeof ack === 'function') ack(response);
    else socket.emit('Get_Browser_List_Done', response);
  });

  // === 新增功能：哔哩哔哩解析与下载 ===
  socket.on('Bili_Parse', (payload) => {
    console.log('Bili_Parse', payload);
    setTimeout(() => {
      // Mock 视频信息
      const mockData = {
        title: 'Mock B站视频标题 - 这是一个测试视频',
        author: 'Mock UP主',
        duration: '10:30',
        view: '12.3万',
        cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMTEyMjMzIi8+Cjx0ZXh0IHg9IjE2MCIgeT0iOTAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zZW0iPk1vY2sgVmlkZW88L3RleHQ+Cjwvc3ZnPgo=',
        qualities: [
          { value: '1080p', label: '1080P 高清' },
          { value: '720p', label: '720P 高清' },
          { value: '480p', label: '480P 清晰' }
        ]
      };
      socket.emit('Bili_Parse_Result', { err: null, data: mockData });
    }, 1500);
  });

  socket.on('Bili_Download', (payload) => {
    console.log('Bili_Download', payload);
    // 模拟下载进度
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressInterval);
        socket.emit('Bili_Download_Done', { 
          err: null, 
          file: `Mock_Video_${Date.now()}.mp4` 
        });
      }
      socket.emit('Bili_Download_Progress', {
        percent: Math.round(progress),
        speed: Math.round(Math.random() * 1000 + 500) + ' KB/s',
        eta: progress < 100 ? Math.round((100 - progress) / 10) + ' 秒' : '完成',
        file: 'Mock视频文件.mp4'
      });
    }, 800);
  });

  // === 新增功能：抖音解析与下载 ===
  socket.on('Douyin_Parse', (payload) => {
    console.log('Douyin_Parse', payload);
    setTimeout(() => {
      const mockData = {
        title: 'Mock抖音视频标题',
        author: 'Mock抖音用户',
        cover: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjkwIiB2aWV3Qm94PSIwIDAgMTYwIDkwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjkwIiBmaWxsPSIjZmYwMDc3Ii8+Cjx0ZXh0IHg9IjgwIiB5PSI0NSIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIwLjNlbSI+RG91eWluPC90ZXh0Pgo8L3N2Zz4K'
      };
      socket.emit('Douyin_Parse_Result', { err: null, data: mockData });
    }, 1200);
  });

  socket.on('Douyin_Download', (payload) => {
    console.log('Douyin_Download', payload);
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressInterval);
        socket.emit('Douyin_Download_Done', { 
          err: null, 
          file: `Mock_Douyin_Video_${Date.now()}.mp4` 
        });
      }
      socket.emit('Douyin_Download_Progress', {
        percent: Math.round(progress),
        speed: Math.round(Math.random() * 800 + 300) + ' KB/s'
      });
    }, 600);
  });

  // === 新增功能：云端硬盘管理 ===
  const mockFiles = [
    { name: 'demo_video_1.mp4', size: 12345678 },
    { name: 'sample_music.mp3', size: 4567890 },
    { name: 'document.pdf', size: 987654 }
  ];

  socket.on('Cloud_List', () => {
    console.log('Cloud_List requested');
    setTimeout(() => {
      socket.emit('Cloud_List_Result', { err: null, files: mockFiles });
    }, 500);
  });

  socket.on('Cloud_Upload_Chunk', (payload) => {
    console.log('Cloud_Upload_Chunk', payload?.name, payload?.offset);
    socket.emit('Cloud_Upload_Ack', { status: 'ok' });
  });

  socket.on('Cloud_Upload_Done', (payload) => {
    console.log('Cloud_Upload_Done', payload);
    // 添加到模拟文件列表
    if (payload?.name) {
      mockFiles.push({ name: payload.name, size: payload.size || 0 });
    }
    socket.emit('Cloud_Upload_Done_Result', { err: null });
  });

  socket.on('Cloud_Download', (payload) => {
    console.log('Cloud_Download', payload);
    // 简单模拟：在真实应用中，这里会提供文件下载链接或直接传输文件数据
    setTimeout(() => {
      socket.emit('Cloud_Download_Result', { 
        err: null, 
        message: `文件 ${payload?.name} 下载已开始（模拟）` 
      });
    }, 300);
  });

  socket.on('Cloud_Delete', (payload) => {
    console.log('Cloud_Delete', payload);
    const index = mockFiles.findIndex(f => f.name === payload?.name);
    if (index > -1) {
      mockFiles.splice(index, 1);
      socket.emit('Cloud_Delete_Result', { err: null });
    } else {
      socket.emit('Cloud_Delete_Result', { err: '文件不存在' });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', reason);
  });
});

const PORT = 20427;
server.listen(PORT, () => {
  console.log(`Mock Socket.IO server listening on http://127.0.0.1:${PORT}`);
});