const POLL_MS = 12000;

const STATUS_LABEL = {
  aguardando: "Aguardando",
  falando: "Falando",
  votou: "Votou",
  pediu_vista: "Pediu vista",
  impedido: "Impedido"
};

const VOTO_LABEL = {
  abrir: "Abrir",
  arquivar: "Arquivar",
  abstencao: "Abstenção"
};

const PERSON_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="8.2" r="3.6" stroke="currentColor" stroke-width="1.6"/>
  <path d="M4.5 19.2c0-3.9 3.4-5.9 7.5-5.9s7.5 2 7.5 5.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function avatarClassFor(m) {
  if (m.voto) return m.voto;
  if (m.status === 'pediu_vista' || m.status === 'impedido' || m.status === 'falando') return m.status;
  return '';
}

function statusTextFor(m) {
  if (m.voto) return VOTO_LABEL[m.voto] || m.voto;
  return STATUS_LABEL[m.status] || m.status;
}

function avatar(m) {
  return `<div class="avatar-badge ${avatarClassFor(m)}">${PERSON_ICON}</div>`;
}

function render(data) {
  const s = data.session;

  const pill = document.getElementById('status-pill');
  const dot = '<span class="dot"></span>';
  if (s.status === 'em_andamento') {
    pill.innerHTML = dot + 'Ao vivo';
    pill.className = 'status-pill live';
  } else if (s.status === 'encerrada') {
    pill.innerHTML = dot + 'Encerrada';
    pill.className = 'status-pill';
  } else if (s.status === 'vista') {
    pill.innerHTML = dot + 'Suspensa · pedido de vista';
    pill.className = 'status-pill';
  } else {
    pill.innerHTML = dot + 'Aguardando início';
    pill.className = 'status-pill';
  }

  const ministers = data.ministros.slice().sort((a, b) => a.ordem - b.ordem);
  const speaker = s.ministroFalando ? ministers.find(m => m.id === s.ministroFalando) : null;
  document.getElementById('speaking-name').textContent = speaker ? speaker.nome : 'Ninguém no momento';
  document.getElementById('speaking-role').textContent = speaker ? (speaker.cargo + ' · ' + (s.faseAtual || '')) : (s.faseAtual || '');

  const val = Math.max(0, Math.min(100, (s.inclinacao && s.inclinacao.valor) ?? 50));
  document.getElementById('ruler-marker').style.left = val + '%';
  document.getElementById('ruler-value').textContent = Math.round(val) + '%';
  const fonte = s.inclinacao && s.inclinacao.fonte === 'auto' ? 'Estimativa automática' : 'Confirmado manualmente';
  const atualizado = s.inclinacao && s.inclinacao.atualizadoEm ? ' · ' + fmtTime(s.inclinacao.atualizadoEm) : '';
  document.getElementById('ruler-source').textContent = fonte + atualizado;

  let abrir = 0, arquivar = 0, vista = 0, aguardando = 0;
  ministers.forEach(m => {
    if (m.voto === 'abrir') abrir++;
    else if (m.voto === 'arquivar') arquivar++;
    else if (m.status === 'pediu_vista' || m.status === 'impedido') vista++;
    else aguardando++;
  });
  document.getElementById('count-abrir').textContent = abrir;
  document.getElementById('count-arquivar').textContent = arquivar;
  document.getElementById('count-vista').textContent = vista;
  document.getElementById('count-aguardando').textContent = aguardando;

  // Coluna de votos já confirmados
  const confirmedWrap = document.getElementById('confirmed-list');
  confirmedWrap.innerHTML = '';
  const abrirList = ministers.filter(m => m.voto === 'abrir');
  const arquivarList = ministers.filter(m => m.voto === 'arquivar');

  if (abrirList.length === 0 && arquivarList.length === 0) {
    confirmedWrap.innerHTML = '<p class="empty-note">Nenhum voto confirmado ainda.</p>';
  } else {
    const buildGroup = (title, cls, list) => {
      if (list.length === 0) return '';
      let html = `<div class="vote-group-title ${cls}">${title} <span class="n">· ${list.length}</span></div>`;
      list.forEach(m => {
        html += `<div class="vote-row">${avatar(m)}<span class="vote-name">${m.nome}</span></div>`;
      });
      return html;
    };
    confirmedWrap.innerHTML = buildGroup('Abrir investigação', 'abrir', abrirList) + buildGroup('Arquivar', 'arquivar', arquivarList);
  }

  // Coluna com a ordem de votação completa
  const list = document.getElementById('minister-list');
  list.innerHTML = '';
  ministers.forEach(m => {
    const row = document.createElement('div');
    row.className = 'minister-row' + (m.id === s.ministroFalando ? ' is-speaking' : '');
    row.innerHTML = `
      <span class="minister-order">${m.ordem}</span>
      ${avatar(m)}
      <div class="minister-name-wrap">
        <div class="minister-name">${m.nome}</div>
        <div class="minister-role">${m.cargo}${m.possivelImpedimento ? ' · <span class="impedimento-flag">possível impedimento</span>' : ''}</div>
      </div>
      <span class="status-tag ${avatarClassFor(m)}">${statusTextFor(m)}</span>
    `;
    list.appendChild(row);
  });

  const tl = document.getElementById('timeline');
  tl.innerHTML = '';
  (data.linhaDoTempo || []).slice().reverse().forEach(ev => {
    const li = document.createElement('li');
    li.innerHTML = `<time>${fmtTime(ev.hora)}</time>${ev.evento}`;
    tl.appendChild(li);
  });

  document.getElementById('updated-at').textContent = new Date().toLocaleTimeString('pt-BR');
}

async function load() {
  try {
    const res = await fetch('data.json?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    render(data);
  } catch (e) {
    console.error('Falha ao carregar data.json', e);
  }
}

load();
setInterval(load, POLL_MS);
