// ── Página pública de negociação por link individual ──────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, addDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBNkjkDk8V1gz3csSupP3xGk5Wz5B8nxWY",
  authDomain: "figurinhas-copa-2026-a4577.firebaseapp.com",
  projectId: "figurinhas-copa-2026-a4577",
  storageBucket: "figurinhas-copa-2026-a4577.firebasestorage.app",
  messagingSenderId: "247750071545",
  appId: "1:247750071545:web:39baade14aadfd2049fe28"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Estado global ────────────────────────────────────────────────────────────
let ownerUid = null;
let ownerData = null;
let ownerCollection = new Set();
let ownerDuplicates = {};
let allStickers = [];
let pubType = 'troca';
let selectedOffer = new Set();
let selectedWant  = new Set();

// ── Extrair UID da URL (/troca/UID) ─────────────────────────────────────────
function getUidFromPath() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1] || null;
}

// ── Inicialização ────────────────────────────────────────────────────────────
async function init() {
  ownerUid = getUidFromPath();
  if (!ownerUid) { renderError('Link inválido.'); return; }

  try {
    // Carregar figurinhas
    const res = await fetch('/stickers.json');
    const data = await res.json();
    allStickers = data.teams.flatMap(t => t.stickers.map(s => ({ ...s, teamCode: t.code, teamName: t.country || t.code })));

    // Buscar dados do dono pelo UID
    const authSnap = await getDocs(collection(db, 'authorized_users'));
    authSnap.forEach(d => {
      if (d.data().uid === ownerUid) ownerData = { id: d.id, ...d.data() };
    });

    if (!ownerData) { renderError('Usuário não encontrado.'); return; }

    // Verificar se o link está habilitado
    if (ownerData.linkEnabled === false) {
      renderLocked(ownerData);
      return;
    }

    // Carregar coleção e repetidas do dono
    const [colSnap, dupSnap] = await Promise.all([
      getDoc(doc(db, 'collections', ownerUid)),
      getDoc(doc(db, 'duplicates', ownerUid))
    ]);
    if (colSnap.exists()) Object.keys(colSnap.data().items || {}).forEach(c => ownerCollection.add(c));
    if (dupSnap.exists()) ownerDuplicates = dupSnap.data().items || {};

    renderPage();
  } catch (e) {
    console.error(e);
    renderError('Erro ao carregar dados. Tente novamente.');
  }
}

// ── Renderizar página principal ──────────────────────────────────────────────
function renderPage() {
  const missing = allStickers.filter(s => !ownerCollection.has(s.code));
  const dups    = allStickers.filter(s => (ownerDuplicates[s.code] || 0) > 0);
  const owned   = allStickers.filter(s => ownerCollection.has(s.code));

  const photoEl = ownerData.photoURL
    ? `<img class="public-avatar" src="${ownerData.photoURL}" alt="${ownerData.name}" />`
    : `<div class="public-avatar-placeholder">${(ownerData.name || '?')[0].toUpperCase()}</div>`;

  document.getElementById('public-root').innerHTML = `
    <div class="public-header">
      ${photoEl}
      <div>
        <div class="public-user-name">${ownerData.name || ownerData.id}</div>
        <div class="public-user-sub">Copa do Mundo 2026 · Álbum de Figurinhas</div>
        <div class="public-badge">🔗 Link de Negociação</div>
      </div>
    </div>

    <!-- Faltantes do dono -->
    <div class="public-section collapsed-pub" id="pub-sec-missing">
      <div class="public-section-header" onclick="togglePubSection('pub-sec-missing')">
        <div class="public-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e55" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Figurinhas que ${ownerData.name || 'o colecionador'} precisa
          <span class="badge badge-red">${missing.length}</span>
        </div>
        <svg class="collapse-arrow-pub" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="public-section-body">
        <p style="font-size:12px;color:#aaa;margin:0 0 8px">Você tem alguma dessas? Ofereça na proposta!</p>
        <div class="public-sticker-grid">
          ${missing.map(s => `<div class="public-sticker-chip missing"><span class="chip-code">${s.code}</span><span style="font-size:9px;color:#888;text-align:center;max-width:52px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <!-- Repetidas do dono -->
    <div class="public-section collapsed-pub" id="pub-sec-dups">
      <div class="public-section-header" onclick="togglePubSection('pub-sec-dups')">
        <div class="public-section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
          Repetidas disponíveis para troca
          <span class="badge badge-green">${dups.length}</span>
        </div>
        <svg class="collapse-arrow-pub" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="public-section-body">
        <p style="font-size:12px;color:#aaa;margin:0 0 8px">Você precisa de alguma dessas? Solicite na proposta!</p>
        <div class="public-sticker-grid">
          ${dups.map(s => `<div class="public-sticker-chip"><span class="chip-code">${s.code}</span><span class="chip-qty">${ownerDuplicates[s.code]}x</span></div>`).join('')}
        </div>
      </div>
    </div>

    <button class="public-propose-btn" onclick="openPubModal()">
      ✉️ Fazer Proposta de Negociação
    </button>
  `;

  // Preencher grids do modal
  fillModalGrids(missing, dups, owned);
}

function fillModalGrids(missing, dups, owned) {
  // Oferecer: figurinhas que o visitante pode ter (todas as do álbum, mas destacamos as faltantes do dono)
  const offerGrid = document.getElementById('pub-offer-grid');
  if (offerGrid) {
    offerGrid.innerHTML = missing.map(s =>
      `<div class="sticker-select-chip" data-code="${s.code}" onclick="togglePubChip(this,'offer')">${s.code}</div>`
    ).join('');
  }

  // Querer: repetidas do dono
  const wantGrid = document.getElementById('pub-want-grid');
  if (wantGrid) {
    wantGrid.innerHTML = dups.map(s =>
      `<div class="sticker-select-chip" data-code="${s.code}" onclick="togglePubChip(this,'want')">${s.code} <small style="opacity:.6">${ownerDuplicates[s.code]}x</small></div>`
    ).join('');
  }

  const nameEl = document.getElementById('pub-owner-name-inline');
  if (nameEl) nameEl.textContent = ownerData.name || 'colecionador';
}

// ── Renderizar estados especiais ─────────────────────────────────────────────
function renderLocked(data) {
  const photoEl = data.photoURL
    ? `<img class="public-avatar" src="${data.photoURL}" alt="${data.name}" style="margin:0 auto 12px" />`
    : `<div class="public-avatar-placeholder" style="margin:0 auto 12px">${(data.name || '?')[0].toUpperCase()}</div>`;
  document.getElementById('public-root').innerHTML = `
    <div class="public-locked">
      ${photoEl}
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      <h2>${data.name || data.id}</h2>
      <p>Este link de negociação está temporariamente desativado.</p>
    </div>`;
}

function renderError(msg) {
  document.getElementById('public-root').innerHTML = `
    <div class="public-locked">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e55" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <h2>Ops!</h2><p>${msg}</p>
    </div>`;
}

// ── Funções do modal ─────────────────────────────────────────────────────────
window.openPubModal = function() {
  selectedOffer.clear();
  selectedWant.clear();
  document.querySelectorAll('.sticker-select-chip').forEach(c => c.classList.remove('selected'));
  document.getElementById('pub-sender-name').value = '';
  document.getElementById('pub-sender-contact').value = '';
  document.getElementById('pub-message').value = '';
  document.getElementById('pub-value').value = '';
  setPubType('troca');
  document.getElementById('public-proposal-modal').style.display = 'flex';
};

window.closePubModal = function() {
  document.getElementById('public-proposal-modal').style.display = 'none';
};

window.setPubType = function(type) {
  pubType = type;
  document.getElementById('pub-type-troca').classList.toggle('active', type === 'troca');
  document.getElementById('pub-type-venda').classList.toggle('active', type === 'venda');
  document.getElementById('pub-role-wrap').style.display  = type === 'venda' ? '' : 'none';
  document.getElementById('pub-value-wrap').style.display = type === 'venda' ? '' : 'none';
  document.getElementById('pub-want-section').style.display = type === 'troca' ? '' : 'none';
};

window.togglePubChip = function(el, list) {
  const code = el.dataset.code;
  const set = list === 'offer' ? selectedOffer : selectedWant;
  if (set.has(code)) { set.delete(code); el.classList.remove('selected'); }
  else               { set.add(code);    el.classList.add('selected'); }
};

window.submitPubProposal = async function() {
  const senderName    = document.getElementById('pub-sender-name').value.trim();
  const senderContact = document.getElementById('pub-sender-contact').value.trim();
  const message       = document.getElementById('pub-message').value.trim();
  const saleValue     = parseFloat(document.getElementById('pub-value').value) || 0;
  const saleRole      = document.getElementById('pub-role').value;

  if (!senderName)    { alert('Por favor, informe seu nome.'); return; }
  if (!senderContact) { alert('Por favor, informe seu contato.'); return; }
  if (pubType === 'troca' && selectedOffer.size === 0 && selectedWant.size === 0) {
    alert('Selecione ao menos uma figurinha para oferecer ou solicitar.'); return;
  }
  if (pubType === 'venda' && selectedOffer.size === 0) {
    alert('Selecione ao menos uma figurinha para oferecer.'); return;
  }

  const btn = document.getElementById('btn-pub-submit');
  btn.disabled = true;
  btn.textContent = 'Enviando…';

  try {
    await addDoc(collection(db, 'external_proposals'), {
      toUid:         ownerUid,
      toName:        ownerData.name || ownerData.id,
      senderName,
      senderContact,
      message,
      type:          pubType,
      saleRole:      pubType === 'venda' ? saleRole : null,
      saleValue:     pubType === 'venda' ? saleValue : null,
      offeredCodes:  Array.from(selectedOffer),
      requestedCodes: Array.from(selectedWant),
      status:        'pending',
      createdAt:     Date.now(),
      serverTs:      serverTimestamp()
    });

    closePubModal();
    document.getElementById('public-root').insertAdjacentHTML('afterbegin', `
      <div style="background:#1a3a1a;border:1px solid #4a9;border-radius:10px;padding:14px 16px;margin-bottom:14px;color:#9de;font-size:14px;">
        ✅ Proposta enviada com sucesso! <strong>${ownerData.name || 'O colecionador'}</strong> receberá sua solicitação em breve.
      </div>`);
  } catch (e) {
    console.error(e);
    alert('Erro ao enviar proposta. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Enviar Proposta';
  }
};

window.togglePubSection = function(id) {
  document.getElementById(id).classList.toggle('collapsed-pub');
};

// ── Iniciar ──────────────────────────────────────────────────────────────────
init();
