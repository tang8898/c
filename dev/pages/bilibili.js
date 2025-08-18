'use strict';
(function(){
  const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true
  });

  // UI refs
  const el = (id)=>document.getElementById(id);
  const connDot = el('connDot');
  const statusLabel = el('socket-status');
  const urlInput = el('videoUrl');
  const parseBtn = el('parseBtn');
  const parseSpinner = el('parseSpinner');
  const infoWrap = el('videoInfo');
  const thumb = el('videoThumbnail');
  const title = el('videoTitle');
  const author = el('videoAuthor');
  const duration = el('videoDuration');
  const views = el('videoViews');
  const videoQuality = el('videoQuality');
  const audioQuality = el('audioQuality');
  const downloadBtn = el('downloadBtn');
  const downloadSpinner = el('downloadSpinner');
  const progressWrap = el('downloadProgress');
  const progressBar = el('progressBar');
  const percentLabel = el('downloadPercent');
  const speedLabel = el('downloadSpeed');
  const remainLabel = el('remainingTime');
  const fileNameLabel = el('downloadFileName');
  const historyWrap = el('downloadHistory');
  const clearHistoryBtn = el('clearHistoryBtn');
  const messageBox = el('messageBox');

  const HISTORY_KEY = 'peanutdl_bili_history_v1';
  let currentTaskId = null;
  let parsedInfo = null;

  // utils
  function setMsg(msg, type='secondary'){
    messageBox.className = `alert alert-${type} mt-3`;
    messageBox.textContent = msg;
  }
  function toggle(elm, show){ elm.classList[show ? 'remove' : 'add']('d-none'); }
  function addHistory(item){
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
    list.unshift({
      time: new Date().toLocaleString(),
      title: item.title,
      cover: item.cover||'',
      url: item.url,
      quality: item.quality,
      file: item.file||'-'
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0,50)));
    renderHistory();
  }
  function renderHistory(){
    const list = JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');
    if(!list.length){ historyWrap.innerHTML = '暂无下载记录'; return; }
    historyWrap.innerHTML = list.map(x=>`
      <div class="d-flex align-items-center gap-3 py-2 border-bottom border-dark-subtle">
        <img src="${x.cover}" onerror="this.style.display='none'" width="72" height="40" style="object-fit:cover;border-radius:6px;"/>
        <div class="flex-fill">
          <div class="small">${x.title}</div>
          <div class="text-muted small">${x.time} · ${x.quality}</div>
          <a href="${x.url}" target="_blank" class="small">源链接</a>
        </div>
        <div class="text-muted small">${x.file}</div>
      </div>
    `).join('');
  }

  // socket events
  socket.on('connect', ()=>{
    connDot.classList.remove('bg-danger');
    connDot.classList.add('bg-success');
    statusLabel.textContent = 'Connected';
  });
  socket.on('disconnect', ()=>{
    connDot.classList.add('bg-danger');
    connDot.classList.remove('bg-success');
    statusLabel.textContent = 'Disconnected';
  });

  // 假定后端支持以下事件：Bili_Parse, Bili_Download, Download_Progress
  socket.on('Bili_Parse_Result', (payload)=>{
    parseSpinner.classList.add('d-none');
    parseBtn.disabled = false;
    if(!payload || payload.err){
      setMsg(payload?.err || '解析失败，请检查链接是否正确');
      return;
    }
    parsedInfo = payload.data;
    // 填充信息
    toggle(infoWrap, true);
    setMsg('解析成功，请选择清晰度并开始下载', 'success');
    title.textContent = parsedInfo.title || '无标题';
    author.textContent = parsedInfo.author || '-';
    duration.textContent = parsedInfo.duration || '-';
    views.textContent = parsedInfo.view || '-';
    thumb.src = parsedInfo.cover || '';

    // 根据后端返回的清晰度覆盖默认选项
    if(Array.isArray(parsedInfo.qualities) && parsedInfo.qualities.length){
      videoQuality.innerHTML = parsedInfo.qualities.map(q=>`<option value="${q.value}">${q.label}</option>`).join('');
    }
  });

  socket.on('Bili_Download_Progress', (p)=>{
    if(!p) return;
    toggle(progressWrap, true);
    const perc = Math.max(0, Math.min(100, Math.round(p.percent || 0)));
    progressBar.style.width = perc + '%';
    percentLabel.textContent = perc + '%';
    speedLabel.textContent = p.speed || '0 KB/s';
    remainLabel.textContent = p.eta || '计算中...';
    fileNameLabel.textContent = p.file || '正在下载...';
  });

  socket.on('Bili_Download_Done', (res)=>{
    downloadSpinner.classList.add('d-none');
    downloadBtn.disabled = false;
    setMsg(res?.err ? ('下载失败：' + res.err) : ('下载完成，文件已保存至：' + (res?.path||'') + ((res?.path && res?.file)?'\\':'') + (res?.file||'')), res?.err ? 'danger' : 'success');
    if(!res?.err){
      addHistory({
        title: parsedInfo?.title || '-',
        cover: parsedInfo?.cover || '',
        url: urlInput.value.trim(),
        quality: videoQuality.options[videoQuality.selectedIndex]?.text || '',
        file: res.file || ''
      });
    }
  });

  // UI handlers
  parseBtn.addEventListener('click', ()=>{
    const url = urlInput.value.trim();
    if(!url){ return setMsg('请先输入B站视频链接'); }
    parsedInfo = null;
    toggle(infoWrap, false);
    setMsg('正在解析...', 'secondary');
    parseBtn.disabled = true; parseSpinner.classList.remove('d-none');
    socket.emit('Bili_Parse', { url });
  });

  downloadBtn.addEventListener('click', ()=>{
    if(!parsedInfo){ return setMsg('请先解析视频'); }
    const url = urlInput.value.trim();
    const vq = videoQuality.value;
    const aq = audioQuality.value;
    const type = document.querySelector('input[name="downloadType"]:checked').value;
    const audioFormatEl = document.getElementById('audioFormat');
    const audioFormat = audioFormatEl ? audioFormatEl.value || 'mp3' : 'mp3';
    setMsg('开始下载...', 'secondary');
    downloadBtn.disabled = true; downloadSpinner.classList.remove('d-none');
    toggle(progressWrap, true);
    socket.emit('Bili_Download', { url, vq, aq, type, audioFormat, meta: parsedInfo, taskId: currentTaskId });
  });

  clearHistoryBtn.addEventListener('click', ()=>{
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  });

  // 初始化
  renderHistory();
})();

$(function() {
  // 切换“下载内容”类型时动态更新格式选择区域
  $('input[name="downloadType"]').on('change', function() {
    const type = $('input[name="downloadType"]:checked').val();
    if (type === 'audio') {
      $('#formatSelectorTitle').text('选择音频下载参数');
      $('#videoQualitySection').addClass('d-none');
      $('#audioQualitySection').removeClass('d-none');
      $('#audioFormatSection').removeClass('d-none');
    } else if (type === 'video') {
      $('#formatSelectorTitle').text('选择视频下载参数');
      $('#videoQualitySection').removeClass('d-none');
      $('#audioQualitySection').addClass('d-none');
      $('#audioFormatSection').addClass('d-none');
    } else { // both
      $('#formatSelectorTitle').text('选择下载格式');
      $('#videoQualitySection').removeClass('d-none');
      $('#audioQualitySection').removeClass('d-none');
      $('#audioFormatSection').addClass('d-none');
    }
  });

  // 触发一次以根据默认选项初始化
  $('input[name="downloadType"]:checked').trigger('change');

  // 下载按钮参数带上音频格式
  $('#downloadBtn').off('click.__audiofmt').on('click.__audiofmt', function() {
    const type = $('input[name="downloadType"]:checked').val();
    const audioFormat = $('#audioFormat').val() || 'mp3';
    try {
      // 在已有的下载触发逻辑中注入audioFormat
      window.__peanutdl_bili_hookAudioFormat = audioFormat;
      window.__peanutdl_bili_hookType = type;
    } catch (e) {}
  });
});

// 钩住原有发起下载的socket.emit参数（若已有则合并）
(function() {
  const originalEmit = window.emitBiliDownload;
  if (typeof originalEmit === 'function') {
    window.emitBiliDownload = function(params) {
      const audioFormat = window.__peanutdl_bili_hookAudioFormat || 'mp3';
      const type = window.__peanutdl_bili_hookType || params?.type;
      const merged = Object.assign({}, params, { audioFormat, type });
      return originalEmit(merged);
    };
  }
})();