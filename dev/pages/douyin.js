'use strict';
(function(){
  const socket = io({ transports: ['websocket', 'polling'], reconnection: true });
  const $ = (s)=>document.querySelector(s);
  const connDot = $('#connDot');
  const statusLabel = $('#socket-status');

  function setConn(ok){
    if(connDot){
      connDot.classList[ok?'add':'remove']('bg-success');
      connDot.classList[ok?'remove':'add']('bg-danger');
    }
    if(statusLabel) statusLabel.textContent = ok?'Connected':'Disconnected';
  }

  socket.on('connect', ()=>setConn(true));
  socket.on('disconnect', ()=>setConn(false));

  const url = $('#dyUrl');
  const parseBtn = $('#dyParse');
  const info = $('#dyInfo');
  const cover = $('#dyCover');
  const title = $('#dyTitle');
  const author = $('#dyAuthor');
  const dlBtn = $('#dyDownload');
  const msg = $('#dyMsg');
  const prog = $('#dyProgress');
  const bar = $('#dyBar');
  const percent = $('#dyPercent');
  const speed = $('#dySpeed');

  const optionWrap = $('#dyOptions');
  const audioOptWrap = $('#dyAudioOptions');
  const audioQuality = $('#dyAudioQuality');
  const audioFormat = $('#dyAudioFormat');

  const pathWrap = $('#dyPathWrap');
  const pathInput = $('#dyDownloadPath');
  const setPathBtn = $('#dySetPath');
  let currentDownloadDir = '';
  let userOverridePath = '';

  function setMsg(t, type='secondary'){
    msg.className = `alert alert-${type} mt-3`;
    msg.textContent = t;
  }
  function toggle(el, show){ if(!el) return; el.classList[show?'remove':'add']('d-none'); }

  // 解析
  parseBtn.addEventListener('click', ()=>{
    const v = (url.value||'').trim();
    if(!v) return setMsg('请粘贴抖音链接');
    setMsg('解析中...');
    socket.emit('Douyin_Parse', { url: v });
  });

  // 下载
  dlBtn.addEventListener('click', ()=>{
    const v = (url.value||'').trim();
    if(!v) return setMsg('请先解析');
    const type = (document.querySelector('input[name="dyType"]:checked')||{}).value || 'video';
    const aq = audioQuality ? audioQuality.value : '192k';
    const audioFmt = audioFormat ? audioFormat.value : 'mp3';

    // 若用户输入了路径，先下发设置
    const p = (pathInput?.value||'').trim();
    if(p && p !== currentDownloadDir){
      socket.emit('Set_Download_Dir', { downloadDir: p });
      userOverridePath = p;
    }

    setMsg('开始下载...');
    socket.emit('Douyin_Download', { url: v, type, aq, audioFormat: audioFmt });
  });

  // 解析结果
  socket.on('Douyin_Parse_Result', (res)=>{
    if(!res || res.err){ return setMsg(res?.err||'解析失败'); }
    toggle(info, true);
    toggle(optionWrap, true);
    toggle(pathWrap, true);
    setMsg('解析成功，请选择下载参数后点击开始下载', 'success');
    cover.src = res.data?.cover||'';
    title.textContent = res.data?.title||'-';
    author.textContent = res.data?.author||'-';

    // 解析成功后获取默认下载目录并填充
    socket.emit('Get_Download_Dir');
  });

  socket.on('Get_Download_Dir_Result', (r)=>{
    if(r && !r.err){
      currentDownloadDir = r.downloadDir || '';
      if(pathInput && !userOverridePath){
        pathInput.value = currentDownloadDir;
      }
    }
  });

  // 进度
  socket.on('Douyin_Download_Progress', (p)=>{
    toggle(prog, true);
    const perc = Math.max(0, Math.min(100, Math.round(p?.percent||0)));
    bar.style.width = perc+'%';
    percent.textContent = perc+'%';
    speed.textContent = p?.speed||'0 KB/s';
  });

  socket.on('Douyin_Download_Done', (r)=>{
    setMsg(r?.err?('下载失败：'+r.err):('下载完成，文件已保存至：'+(r?.path||'')+((r?.path&&r?.file)?'\\':'')+(r?.file||'')), r?.err?'danger':'success');
  });

  // 下载类型切换：仅音频时显示音频选项
  function onTypeChange(){
    const type = (document.querySelector('input[name="dyType"]:checked')||{}).value || 'video';
    const isAudio = type === 'audio';
    toggle(audioOptWrap, isAudio);
  }
  document.querySelectorAll('input[name="dyType"]').forEach(el=>{
    el.addEventListener('change', onTypeChange);
  });
  onTypeChange();

  // 应用按钮：显式设置下载目录
  if(setPathBtn){
    setPathBtn.addEventListener('click', ()=>{
      const p = (pathInput?.value||'').trim();
      if(!p){ setMsg('路径为空，将使用默认下载目录'); return; }
      socket.emit('Set_Download_Dir', { downloadDir: p });
      userOverridePath = p;
      setMsg('已应用下载路径：'+p, 'success');
    });
  }
})();