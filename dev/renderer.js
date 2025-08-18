// Web/Electron 兼容：检测是否存在 Electron API，否则回退到 Web 模式
const hasElectron = typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.onSocketStatusUpdated === 'function';

if (hasElectron) {
  window.electronAPI.onSocketStatusUpdated((event, status) => {
    const el = document.getElementById('socket-status');
    if (el) el.textContent = status ? 'Connected' : 'Disconnected';
  });
  const btn = document.getElementById('myButton');
  if (btn) {
    btn.addEventListener('click', async () => {
      await window.electronAPI.clearCache();
    });
  }
} else {
  // Web 回退：使用浏览器版 socket.io-client 更新连接状态；缓存清理在 Web 不可用，禁用按钮。
  document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('socket-status');
    const btn = document.getElementById('myButton');
    const msg = document.getElementById('messageBox');

    const setMsg = (text, type = 'secondary') => {
      if (!msg) return;
      msg.className = `alert alert-${type} mt-3`;
      msg.textContent = text;
    };

    if (btn) {
      btn.disabled = true;
      btn.classList.add('disabled');
      btn.title = 'Web 环境不支持清理浏览器缓存';
      btn.addEventListener('click', () => alert('Web 环境不支持清理浏览器缓存'));
    }

    if (typeof io === 'function') {
      const socket = io({ transports: ['websocket', 'polling'] });
      socket.on('connect', () => { if (el) el.textContent = 'Connected'; setMsg('Connected to mock server', 'success'); });
      socket.on('disconnect', () => { if (el) el.textContent = 'Disconnected'; setMsg('Disconnected', 'warning'); });

      // 1) 设置 UA
      const uaInput = document.getElementById('uaInput');
      const setUaBtn = document.getElementById('setUaBtn');
      setUaBtn?.addEventListener('click', () => {
        const ua = uaInput?.value?.trim();
        if (!ua) return setMsg('请填写 UA', 'warning');
        socket.emit('BrowserSetUA', { ua }, (res) => setMsg(`设置UA: ${res?.status || 'ok'}`, 'info'));
      });

      // 2) 打开 URL
      const openUrlInput = document.getElementById('openUrlInput');
      const openUrlBtn = document.getElementById('openUrlBtn');
      openUrlBtn?.addEventListener('click', () => {
        const url = openUrlInput?.value?.trim();
        if (!url) return setMsg('请填写 URL', 'warning');
        socket.emit('OpenURL', { url }, (res) => setMsg(`打开URL: ${res?.status || 'ok'}`, 'info'));
      });

      // 3) 抓取 HTML
      const urlInput = document.getElementById('urlInput');
      const fetchHtmlBtn = document.getElementById('fetchHtmlBtn');
      const htmlOutput = document.getElementById('htmlOutput');
      fetchHtmlBtn?.addEventListener('click', () => {
        const u = urlInput?.value?.trim();
        if (!u) return setMsg('请填写 URL', 'warning');
        socket.emit('Get_Browser_HTML', { url: [u], title: true, html: true }, (res) => {
          if (res?.status === 200) {
            const html = (res?.list?.[0]?.html) || '';
            if (htmlOutput) htmlOutput.value = html;
            setMsg('HTML 获取成功', 'success');
          } else {
            setMsg(`HTML 获取失败: ${res?.error || res?.status}`, 'danger');
          }
        });
      });

      // 4) 窗口列表
      const listWindowsBtn = document.getElementById('listWindowsBtn');
      const windowsOutput = document.getElementById('windowsOutput');
      listWindowsBtn?.addEventListener('click', () => {
        socket.emit('Get_Browser_List', {}, (res) => {
          if (res?.status === 200) {
            windowsOutput.textContent = JSON.stringify(res.list || [], null, 2);
            setMsg('窗口列表已更新', 'info');
          } else {
            windowsOutput.textContent = '获取失败';
            setMsg('获取窗口列表失败', 'danger');
          }
        });
      });

      // 5) Cookie 操作
      const cookieUrlInput = document.getElementById('cookieUrlInput');
      const cookieNameInput = document.getElementById('cookieNameInput');
      const cookieValueInput = document.getElementById('cookieValueInput');
      const setCookieBtn = document.getElementById('setCookieBtn');
      const getCookiesBtn = document.getElementById('getCookiesBtn');
      const cookiesOutput = document.getElementById('cookiesOutput');

      setCookieBtn?.addEventListener('click', () => {
        const url = cookieUrlInput?.value?.trim();
        const name = cookieNameInput?.value?.trim();
        const value = cookieValueInput?.value?.trim();
        if (!url || !name) return setMsg('请填写 cookie URL 与 名称', 'warning');
        socket.emit('Set_Cookie', { url, name, value }, (res) => setMsg(`设置 Cookie: ${res?.status || 'ok'}`, 'info'));
      });

      getCookiesBtn?.addEventListener('click', () => {
        const url = cookieUrlInput?.value?.trim();
        if (!url) return setMsg('请填写 cookie URL', 'warning');
        socket.emit('GetCookis', { url }, (res) => {
          if (res?.status === 200) {
            cookiesOutput.textContent = JSON.stringify(res?.cookies || [{ name: 'mock', value: '123' }], null, 2);
            setMsg('Cookie 获取成功', 'success');
          } else {
            cookiesOutput.textContent = '获取失败';
            setMsg('Cookie 获取失败', 'danger');
          }
        });
      });

      // 6) 标记 BrowserID 可用
      socket.emit('BrowserID', 'true');
    } else {
      if (el) el.textContent = 'socket.io-client 未加载';
      setMsg('socket.io-client 未加载', 'danger');
    }
  });
}

