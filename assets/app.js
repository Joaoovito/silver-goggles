const POLL_MS = 12000;

const STATUS_LABEL = {
  aguardando: "Aguardando",
  falando: "Falando",
  votou: "Votou",
  pediu_vista: "Pediu vista",
  impedido: "Impedido/suspeito"
};

const VOTO_LABEL = {
  abrir: "Abrir investigação",
  arquivar: "Arquivar",
  abstencao: "Abstenção"
};

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function badgeClassFor(m) {
  if (m.voto) return m.voto;
  if (m.status === 'pediu_vista' || m.status === 'impedido') return m.status;
  return m.status || 'aguardando';
}

function badgeTextFor(m) {
  if (m.voto) return VOTO_LABEL[m.voto] || m.voto;
  return STATUS_LABEL[m.status] || m.status;
}

function render(data) {
  const s = data.session;

  const pill = document.getElementById('status-pill');
  if (s.status === 'em_andamento') {
    pill.textContent = 'Ao vivo';
    pill.className = 'status-pill live';
  } else if (s.status === 'encerrada') {
    pill.textContent = 'Encerrada';
    pill.className = 'status-pill';
  } else if (s.status === 'vista') {
    pill.textContent = 'Suspensa (pedido de vista)';
    pill.className = 'status-pill';
  } else {
    pill.textContent = 'Aguardando início';
    pill.className = 'status-pill';
  }

  const speaker = s.ministroFalando ? data.ministros.find(m => m.id === s.ministroFalando) : null;
  document.getElementById('speaking-name').textContent = speaker ? speaker.nome : 'Ninguém no momento';
  document.getElementById('speaking-role').textContent = speaker ? (speaker.cargo + ' · ' + s.faseAtual) : (s.faseAtual || '');

  const val = Math.max(0, Math.min(100, (s.inclinacao && s.inclinacao.valor) ?? 50));
  document.getElementById('ruler-marker').style.left = val + '%';
  document.getElementById('ruler-value').textContent = Math.round(val) + '%';
  const fonte = s.inclinacao && s.inclinacao.fonte === 'auto' ? '🤖 estimativa automática' : '🧑 confirmado manualmente';
  const atualizado = s.inclinacao && s.inclinacao.atualizadoEm ? ' · ' + fmtTime(s.inclinacao.atualizadoEm) : '';
  document.getElementById('ruler-source').textContent = fonte + atualizado;

  let abrir = 0, arquivar = 0, vista = 0, aguardando = 0;
  data.ministros.forEach(m => {
    if (m.voto === 'abrir') abrir++;
    else if (m.voto === 'arquivar') arquivar++;
    else if (m.status === 'pediu_vista' || m.status === 'impedido') vista++;
    else aguardando++;
  });
  document.getElementById('count-abrir').textContent = abrir;
  document.getElementById('count-arquivar').textContent = arquivar;
  document.getElementById('count-vista').textContent = vista;
  document.getElementById('count-aguardando').textContent = aguardando;

  const list = document.getElementById('minister-list');
  list.innerHTML = '';
  data.ministros.slice().sort((a, b) => a.ordem - b.ordem).forEach(m => {
    const row = document.createElement('div');
    row.className = 'minister-row' + (m.id === s.ministroFalando ? ' is-speaking' : '');
    row.innerHTML = `
      <span class="minister-order">${m.ordem}</span>
      <div class="minister-name-wrap">
        <div class="minister-name">${m.nome}</div>
        <div class="minister-role">${m.cargo}${m.possivelImpedimento ? ' · <span class="impedimento-flag">possível impedimento</span>' : ''}</div>
      </div>
      <span class="badge ${badgeClassFor(m)}">${badgeTextFor(m)}</span>
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
