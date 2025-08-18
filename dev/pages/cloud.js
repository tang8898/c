'use strict';
(function(){
  const socket = io({ transports:['websocket','polling'], reconnection:true });
  const $ = (s)=>document.querySelector(s);
  const connDot = $('#connDot');
  const statusLabel = $('#socket-status');

  function setConn(ok){
    connDot?.classList[ok?'add':'remove']('bg-success');
    connDot?.classList[ok?'remove':'add']('bg-danger');
    if(statusLabel) statusLabel.textContent = ok?'Connected':'Disconnected';
  }

  socket.on('connect', ()=>setConn(true));
  socket.on('disconnect', ()=>setConn(false));

  const fileList = $('#fileList');
  const refreshBtn = $('#refreshBtn');
  const fileInput = $('#fileInput');
  const uploadBtn = $('#uploadBtn');
  const upWrap = $('#upWrap');
  const upBar = $('#upBar');
  const upMsg = $('#upMsg');
  const cloudMsg = $('#cloudMsg');

  function setMsg(t, type='secondary'){
    cloudMsg.className = `alert alert-${type} mt-3`;
    cloudMsg.textContent = t;
  }

  function renderList(list){
    if(!Array.isArray(list) || !list.length){ fileList.textContent = '暂无文件'; return; }
    fileList.innerHTML = list.map(x=>`
      <div class="d-flex justify-content-between align-items-center py-2 border-bottom border-dark-subtle">
        <div class="text-truncate" style="max-width:60%">${x.name}</div>
        <div class="text-muted small">${(x.size||0)} bytes</div>
        <div>
          <button class="btn btn-sm btn-outline-primary" data-dl="${x.name}">下载</button>
          <button class="btn btn-sm btn-outline-danger ms-2" data-del="${x.name}">删除</button>
        </div>
      </div>
    `).join('');

    fileList.querySelectorAll('[data-dl]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const name = btn.getAttribute('data-dl');
        socket.emit('Cloud_Download', { name });
      });
    });
    fileList.querySelectorAll('[data-del]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const name = btn.getAttribute('data-del');
        socket.emit('Cloud_Delete', { name });
      });
    });
  }

  refreshBtn.addEventListener('click', ()=>{
    socket.emit('Cloud_List');
  });

  uploadBtn.addEventListener('click', ()=>{
    const files = fileInput.files;
    if(!files || !files.length){ return setMsg('请选择文件'); }
    // 简化：逐个文件读取并通过socket发送块（示例，真实生产建议使用HTTP分片上传）
    Array.from(files).forEach(async (f)=>{
      const chunkSize = 256*1024; // 256KB
      let offset = 0;
      upWrap.classList.remove('d-none');
      setMsg('上传中...');
      while(offset < f.size){
        const slice = f.slice(offset, Math.min(offset+chunkSize, f.size));
        const buf = await slice.arrayBuffer();
        socket.emit('Cloud_Upload_Chunk', { name: f.name, offset, data: Array.from(new Uint8Array(buf)) });
        offset += chunkSize;
        const perc = Math.min(100, Math.round(offset / f.size * 100));
        upBar.style.width = perc+'%';
        upMsg.textContent = `${f.name} · ${perc}%`;
      }
      socket.emit('Cloud_Upload_Done', { name: f.name, size: f.size });
    });
  });

  socket.on('Cloud_List_Result', (res)=>{
    if(res?.err){ setMsg(res.err, 'danger'); return; }
    renderList(res?.files||[]);
  });
  socket.on('Cloud_Upload_Ack', (r)=>{ /* 可用于服务端确认块 */ });
  socket.on('Cloud_Upload_Done_Result', (r)=>{
    setMsg(r?.err?('上传失败：'+r.err):'上传完成', r?.err?'danger':'success');
    socket.emit('Cloud_List');
  });
  socket.on('Cloud_Delete_Result', (r)=>{
    setMsg(r?.err?('删除失败：'+r.err):'删除完成', r?.err?'danger':'success');
    socket.emit('Cloud_List');
  });

  // 初始化拉取一次
  socket.emit('Cloud_List');
})();