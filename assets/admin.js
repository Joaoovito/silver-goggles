let currentData = null;
let currentSha = null;
let pendingTimelineAdd = [];

const $ = id => document.getElementById(id);

function log(msg, ok) {
  const el = $('log');
  el.textContent = msg;
  el.className = ok === undefined ? '' : (ok ? 'ok' : 'err');
}

function loadConfig() {
  $('cfg-repo').value = localStorage.getItem('stf_repo') || '';
  $('cfg-branch').value = localStorage.getItem('stf_branch') || 'main';
  $('cfg-path').value = localStorage.getItem('stf_path') || 'data.json';
  $('cfg-token').value = localStorage.getItem('stf_token') || '';
}

function saveConfig() {
  localStorage.setItem('stf_repo', $('cfg-repo').value.trim());
  localStorage.setItem('stf_branch', $('cfg-branch').value.trim());
  localStorage.setItem('stf_path', $('cfg-path').value.trim());
  localStorage.setItem('stf_token', $('cfg-token').value.trim());
  log('Configuração salva neste navegador.', true);
}

function ghHeaders() {
  return {
    'Authorization': 'Bearer ' + $('cfg-token').value.trim(),
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function apiUrl() {
  const repo = $('cfg-repo').value.trim();
  const path = $('cfg-path').value.trim();
  return `https://api.github.com/repos/${repo}/contents/${path}`;
}

// UTF-8 safe base64 encode/decode
function b64decode(b64) {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), c => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}
function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
}

async function ghGet() {
  const branch = $('cfg-branch').value.trim();
  const res = await fetch(apiUrl() + '?ref=' + encodeURIComponent(branch), { headers: ghHeaders() });
  if (!res.ok) throw new Error('GET falhou: ' + res.status + ' ' + (await res.text()));
  const json = await res.json();
  currentSha = json.sha;
  return JSON.parse(b64decode(json.content));
}

async function ghPut(dataObj, message) {
  const branch = $('cfg-branch').value.trim();
  const body = {
    message: message || 'Atualização manual via painel de controle',
    content: b64encode(JSON.stringify(dataObj, null, 2)),
    sha: currentSha,
    branch
  };
  const res = await fetch(apiUrl(), {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('PUT falhou: ' + res.status + ' ' + (await res.text()));
  const json = await res.json();
  currentSha = json.content.sha;
}

function populateForm(data) {
  currentData = data;
  const s = data.session;
  $('s-status').value = s.status;
  $('s-fase').value = s.faseAtual || '';
  $('s-inclinacao').value = (s.inclinacao && s.inclinacao.valor) ?? 50;
  $('s-inclinacao-val').textContent = $('s-inclinacao').value;
  $('s-nota').value = (s.inclinacao && s.inclinacao.nota) || '';

  const falandoSel = $('s-falando');
  falandoSel.innerHTML = '<option value="">Nenhum</option>';
  data.ministros.slice().sort((a, b) => a.ordem - b.ordem).forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.nome;
    falandoSel.appendChild(opt);
  });
  falandoSel.value = s.ministroFalando || '';

  const list = $('minister-edit-list');
  list.innerHTML = '';
  data.ministros.slice().sort((a, b) => a.ordem - b.ordem).forEach(m => {
    const row = document.createElement('div');
    row.className = 'minister-edit-row';
    row.dataset.id = m.id;
    row.innerHTML = `
      <div><strong>${m.ordem}. ${m.nome}</strong><br><small>${m.cargo}</small></div>
      <select class="m-status">
        <option value="aguardando">Aguardando</option>
        <option value="falando">Falando</option>
        <option value="votou">Votou</option>
        <option value="pediu_vista">Pediu vista</option>
        <option value="impedido">Impedido/suspeito</option>
      </select>
      <select class="m-voto">
        <option value="">Sem voto</option>
        <option value="abrir">Abrir investigação</option>
        <option value="arquivar">Arquivar</option>
        <option value="abstencao">Abstenção</option>
      </select>
    `;
    row.querySelector('.m-status').value = m.status;
    row.querySelector('.m-voto').value = m.voto || '';
    list.appendChild(row);
  });

  const tl = $('admin-timeline');
  tl.innerHTML = '';
  (data.linhaDoTempo || []).slice().reverse().forEach(ev => {
    const li = document.createElement('li');
    const t = ev.hora ? new Date(ev.hora).toLocaleString('pt-BR') : '—';
    li.innerHTML = `<time>${t}</time>${ev.evento}`;
    tl.appendChild(li);
  });

  pendingTimelineAdd = [];
  ['session-panel', 'ministers-panel', 'timeline-panel', 'publish-panel'].forEach(id => $(id).style.display = '');
}

function collectFormData(base) {
  const data = JSON.parse(JSON.stringify(base || currentData));
  data.session.status = $('s-status').value;
  data.session.faseAtual = $('s-fase').value;
  data.session.ministroFalando = $('s-falando').value || null;
  data.session.inclinacao = {
    valor: Number($('s-inclinacao').value),
    fonte: 'manual',
    atualizadoEm: new Date().toISOString(),
    nota: $('s-nota').value
  };

  document.querySelectorAll('.minister-edit-row').forEach(row => {
    const id = row.dataset.id;
    const m = data.ministros.find(x => x.id === id);
    if (!m) return;
    m.status = row.querySelector('.m-status').value;
    m.voto = row.querySelector('.m-voto').value || null;
  });

  data.linhaDoTempo = (data.linhaDoTempo || []).concat(pendingTimelineAdd);
  return data;
}

$('s-inclinacao').addEventListener('input', () => {
  $('s-inclinacao-val').textContent = $('s-inclinacao').value;
});

$('btn-save-cfg').addEventListener('click', saveConfig);

$('btn-load').addEventListener('click', async () => {
  saveConfig();
  log('Carregando...');
  try {
    const data = await ghGet();
    populateForm(data);
    log('Estado atual carregado.', true);
  } catch (e) {
    log(e.message, false);
  }
});

$('btn-add-event').addEventListener('click', () => {
  const text = $('new-event').value.trim();
  if (!text) return;
  pendingTimelineAdd.push({ hora: new Date().toISOString(), evento: text });
  const li = document.createElement('li');
  li.innerHTML = `<time>${new Date().toLocaleString('pt-BR')}</time>${text} <em>(não publicado ainda)</em>`;
  $('admin-timeline').prepend(li);
  $('new-event').value = '';
});

$('btn-publish').addEventListener('click', async () => {
  log('Publicando...');
  $('btn-publish').disabled = true;
  try {
    const fresh = await ghGet(); // evita sobrescrever mudanças feitas por outra pessoa/task nesse meio-tempo
    const merged = collectFormData(fresh);
    await ghPut(merged, 'Atualização manual via painel de controle');
    currentData = merged;
    pendingTimelineAdd = [];
    log('Publicado com sucesso.', true);
  } catch (e) {
    log(e.message, false);
  } finally {
    $('btn-publish').disabled = false;
  }
});

loadConfig();
