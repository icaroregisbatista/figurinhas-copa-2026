// ══════════════════════════════════════════════
// FIGURINHAS COPA 2026 — Firebase App
// ══════════════════════════════════════════════
// IMPORTANTE: Substitua o objeto firebaseConfig abaixo
// com as configurações do seu projeto Firebase.
// ══════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  writeBatch,
  runTransaction,
  serverTimestamp,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── ⚙️ CONFIGURAÇÃO DO FIREBASE ──────────────────────────────
// Cole aqui as configurações do seu projeto Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBNkjkDk8V1gz3csSupP3xGk5Wz5B8nxWY",
  authDomain: "figurinhas-copa-2026-a4577.firebaseapp.com",
  projectId: "figurinhas-copa-2026-a4577",
  storageBucket: "figurinhas-copa-2026-a4577.firebasestorage.app",
  messagingSenderId: "247750071545",
  appId: "1:247750071545:web:39baade14aadfd2049fe28"
};
// ─────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ── Admins autorizados ───────────────────────────────────────
const ADMIN_EMAILS = ['icaroregis@gmail.com'];
// ── Logos embutidos (base64) para PDF ────────────────────────
const FIFA_LOGO_B64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAUCAYAAAD/Rn+7AAABI0lEQVR4nGNk0Ej5zzCIAdNAO4AQGHUgpWDUgZSCUQdSCliIVfjt/DSGU5fvw/mb9l1g6Fuwm+HDqUkMAmZ5eNUwMDAwpITYMkyti2KQcyxnePn2E/Ud+Ov3HwaHuG6y1fg66jNMWryXwctel2H+uqNEO5AuUczFwcbAzcXGMGfNEQYfBz2S9NLFge422gw7Dl9luHn/BYOCtAgDGyvREUd8FLOxsjAcWFQK56fXL2a4ef8FUWr8nQ0YDDRkGULcjRmkxPgZ7E3VGHYfu0ZdB5KbBpmZmRjUFMQZDAKbGBgYIKHp46BHtANpHsXWhioMF288gfMPn7nN4GatTbR+mjvQ39mAYd/JG3D+tx+/GF69+8SgqSxJlH7G0fYghWDUgZQCAI6sYv5cTBUqAAAAAElFTkSuQmCC';
const CC_LOGO_B64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAAAUCAYAAADRA14pAAACXUlEQVR4nO2WT0iaYRzHP2+WfzPKmZW2jYigQyFEt0KKTv3B0EMQ1D2LOnQIii4RdekkdegQ0i0xCq08RV6sa4egQzBZGywoUpiZE8erHTY2R+4VaywwP6eX93n4fn5fHh54hA96fZpXRMlLD/C/KRYudIqFC51i4UInZ+GK0VHqAwGMe3vUbW1RajL98yHydTSEQk92lUotqrq6KLfb+dLXRzqRQN3Tg2F1lSu7/cnCl3BkInnClePjRJaWSCcSAMSPjvh+eYlQVobMYKDO7ca0v0+d243MYECm01G7uYnR58O4vY1Mr0fe3IzJ7+dtMEjl2NizHZnkys6GIPW0fH92xuf2dtLJ5KO1mvV14oEAdx4P2qEh1N3dpEWReCBAbHcX7fAwyrY2AO52dkheXPAuGOSypeVZjmuHg4ZQiI+NjVSvrEhmZ0PyhAWZ7K9ryo4OYl4vADGvF2VnJyqLhfuDgx8lPR7Ci4uEFxaQNzVRNTmJoNUCoJubw+jzoenvz9uRSbbsXEgWToZCKFpbf/8QBAxraz8/hUf7/xheFElFo9S4XAB83diAVAqAyPIyV4OD3Pv9eTsyyZadC8nCUZcL3ewsglwOQLnNhqBQAPDt+BiN1QqAxmolcXJC4vQUTW8vABUjI7yZn0dhNhPz+RAUil85z3Fkkis7G5J3GKBqeppymw0xHEa8veV2ZgYxEqG0tpZqp5MStZpUPM7N1BQlKhXVTicIAqlolJuJCSodDjQDAyTPz1FZLHwymx/d13wc4vU19YeH3Pv9CEplzuy8CxcaxZdWofPqCj8AgJ8oiE4J3DsAAAAASUVORK5CYII=';


// ── Estado global ─────────────────────────────────────────────
let currentUser = null;
let allStickers = [];
let myCollection = new Set();   // Set de códigos que o usuário possui
let myDuplicates = {};          // { code: quantity }
let activeTab = 'colecao';
let activeGroup = 'all';
let activeStatus = null;        // 'missing' | 'owned' | null
let activeTradeGroup = 'all';   // filtro de grupo na aba trocas
let activeProposalStatus = 'all'; // filtro de status das propostas
let activeTradeFilter = 'all';   // filtro tenho/faltando nas negociações
let activeDupStatus = null;      // 'owned' | 'missing' | null — filtro local da aba Repetidas
let searchQuery = '';
let impersonatedUser = null; // { uid, name, email } - usuário que o admin está operando como
let realUser = null;         // backup do currentUser original durante impersonação

// ── Helper: UID ativo (impersonação) ────────────────────────
function getActiveUid() {
  return (impersonatedUser && impersonatedUser.uid) ? impersonatedUser.uid : currentUser.uid;
}
function getActiveUser() {
  return impersonatedUser ? { uid: impersonatedUser.uid, email: impersonatedUser.email, displayName: impersonatedUser.name } : currentUser;
}

// ── Elementos do DOM ──────────────────────────────────────────
const loginScreen    = document.getElementById('login-screen');
const deniedScreen   = document.getElementById('denied-screen');
const appScreen      = document.getElementById('app-screen');
const btnLogin       = document.getElementById('btn-login');
const btnLogout      = document.getElementById('btn-logout');
const btnLogoutDenied= document.getElementById('btn-logout-denied');
const btnCancelLogout= document.getElementById('btn-cancel-logout');
const btnConfirmLogout=document.getElementById('btn-confirm-logout');
const modalLogout    = document.getElementById('modal-logout');
const userAvatar     = document.getElementById('user-avatar');
const userName       = document.getElementById('user-name');
const deniedEmail    = document.getElementById('denied-email');
const progressFill   = document.getElementById('progress-fill');
const progressText   = document.getElementById('progress-text');
const searchInput    = document.getElementById('search-input');
const btnClearSearch = document.getElementById('btn-clear-search');
const loadingOverlay = document.getElementById('loading-overlay');
const stickerGrid    = document.getElementById('sticker-grid');
const stickerGridDup = document.getElementById('sticker-grid-dup');
const emptyState     = document.getElementById('empty-state');
const emptyStateDup  = document.getElementById('empty-state-dup');
const tradingLoading = document.getElementById('trading-loading');
const tradingContent = document.getElementById('trading-content');
const progressPct    = document.getElementById('progress-pct');
const dupTotal       = document.getElementById('dup-total');
const modalCamera    = document.getElementById('modal-camera');
const cameraVideo    = document.getElementById('camera-video');
const cameraResult   = document.getElementById('camera-result');
let   cameraStream   = null;
let   ocrInterval    = null;

// ══════════════════════════════════════════════
// AUTENTICAÇÃO
// ══════════════════════════════════════════════
btnLogin.addEventListener('click', async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  } catch (e) {
    showToast('Erro ao fazer login. Tente novamente.', 'error');
  }
});

btnLogout.addEventListener('click', () => {
  modalLogout.classList.remove('hidden');
});
btnCancelLogout.addEventListener('click', () => {
  modalLogout.classList.add('hidden');
});
btnConfirmLogout.addEventListener('click', async () => {
  modalLogout.classList.add('hidden');
  await signOut(auth);
});
btnLogoutDenied.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showScreen('login');
    return;
  }
  // Mostrar tela de carregamento enquanto verifica autorização
  showScreen('auth-loading');

  // Verificar se está autorizado
  const authorized = await checkAuthorized(user.email);
  if (!authorized) {
    deniedEmail.textContent = user.email;
    showScreen('denied');
    return;
  }

  currentUser = user;
  showScreen('app');

  // Mostrar aba Estatísticas para todos os usuários
  document.getElementById('tab-btn-stats').classList.remove('hidden');

  // Mostrar aba Admin apenas para administradores
  const isAdminUser = ADMIN_EMAILS.includes(user.email.toLowerCase());
  if (isAdminUser) {
    document.getElementById('tab-btn-admin').classList.remove('hidden');
    // Admin não tem coleção própria: ocultar abas Coleção e Repetidas
    document.getElementById('tab-btn-colecao').classList.add('hidden');
    document.getElementById('tab-btn-repetidas').classList.add('hidden');
    // Ocultar progresso no header (não tem sentido para o admin)
    document.getElementById('dup-count-header').classList.add('hidden');
    document.getElementById('missing-count-header').classList.add('hidden');
    // Ocultar botão PDF (só faz sentido ao impersonar)
    document.getElementById('btn-export-pdf').classList.add('hidden');
    // Ir direto para a aba Admin
    document.querySelector('[data-tab="admin"]')?.click();
  }

  // Atualizar visibilidade do botão de link
  updateShareLinkVisibility();

  await initApp();
});

async function checkAuthorized(email) {
  try {
    const docRef = doc(db, 'authorized_users', email.toLowerCase());
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (e) {
    return false;
  }
}

function showScreen(name) {
  loginScreen.classList.add('hidden');
  deniedScreen.classList.add('hidden');
  appScreen.classList.add('hidden');
  const authLoadingScreen = document.getElementById('auth-loading-screen');
  if (authLoadingScreen) authLoadingScreen.classList.add('hidden');
  if (name === 'login') loginScreen.classList.remove('hidden');
  else if (name === 'denied') deniedScreen.classList.remove('hidden');
  else if (name === 'app') appScreen.classList.remove('hidden');
  else if (name === 'auth-loading') { if (authLoadingScreen) authLoadingScreen.classList.remove('hidden'); }
}

// ══════════════════════════════════════════════
// INICIALIZAÇÃO DO APP
// ══════════════════════════════════════════════

// Atualiza o header (avatar + nome) para qualquer usuário
// { displayName, email, photoURL } — aceita tanto currentUser quanto impersonatedUser
function updateHeader({ displayName, email, photoURL }) {
  const name = displayName || email || '';
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const initialsEl = document.getElementById('user-avatar-initials');

  userAvatar.innerHTML = '';
  if (photoURL) {
    const img = document.createElement('img');
    img.src = photoURL;
    img.alt = initials;
    img.onerror = () => {
      img.remove();
      const span = document.createElement('span');
      span.id = 'user-avatar-initials';
      span.textContent = initials;
      userAvatar.appendChild(span);
    };
    userAvatar.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.id = 'user-avatar-initials';
    span.textContent = initials;
    userAvatar.appendChild(span);
  }
  userName.textContent = name.split(' ')[0];
}

async function initApp() {
  // Exibir dados do usuário no header
  updateHeader(currentUser);

  // Registrar UID e photoURL no documento do usuário autorizado
  try {
    const userDocRef = doc(db, 'authorized_users', currentUser.email.toLowerCase());
    const updates = { uid: currentUser.uid };
    if (currentUser.photoURL) updates.photoURL = currentUser.photoURL;
    await updateDoc(userDocRef, updates).catch(() => {});
  } catch (_) {}

  // Carregar figurinhas do JSON estático (instantâneo, sem Firestore)
  loadingOverlay.style.display = 'flex';
  try {
    const res = await fetch('stickers.json');
    allStickers = await res.json();
  } catch (e) {
    showToast('Erro ao carregar figurinhas.', 'error');
    loadingOverlay.style.display = 'none';
    return;
  }

  // Carregar coleção e repetidas do Firestore em paralelo
  const uid = currentUser.uid;
  const [colSnap, dupSnap] = await Promise.all([
    getDoc(doc(db, 'collections', uid)),
    getDoc(doc(db, 'duplicates', uid))
  ]);

  myCollection = new Set(colSnap.exists() ? (colSnap.data().codes || []) : []);
  myDuplicates = dupSnap.exists() ? (dupSnap.data().items || {}) : {};

  loadingOverlay.style.display = 'none';
  updateProgress();
  renderGrid();
  renderDuplicatesGrid();
}

// ══════════════════════════════════════════════
// PROGRESSO
// ══════════════════════════════════════════════
function updateProgress() {
  const owned = myCollection.size;
  const total = allStickers.length;
  const missing = total - owned;
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  progressFill.style.width = pct + '%';
  progressText.textContent = `${owned} / ${total}`;
  progressPct.textContent = `${pct}%`;

  // Contar total de repetidas
  const totalDups = Object.values(myDuplicates).reduce((sum, q) => sum + (q > 0 ? q : 0), 0);
  dupTotal.textContent = totalDups;

  // Contar faltantes
  const missingEl = document.getElementById('missing-total');
  if (missingEl) missingEl.textContent = missing;
}

// ══════════════════════════════════════════════
// FILTROS
// ══════════════════════════════════════════════
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  btnClearSearch.classList.toggle('hidden', !searchQuery);
  renderGrid();
  renderDuplicatesGrid();
  if (activeTab === 'trocas') renderMatchesList();
});

btnClearSearch.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  btnClearSearch.classList.add('hidden');
  renderGrid();
  renderDuplicatesGrid();
  if (activeTab === 'trocas') renderMatchesList();
});

document.querySelectorAll('.filter-chip[data-group]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip[data-group]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeGroup = btn.dataset.group;
    renderGrid();
    renderDuplicatesGrid();
    if (activeTab === 'trocas') renderMatchesList();
  });
});

document.getElementById('filter-missing').addEventListener('click', function() {
  if (activeStatus === 'missing') {
    activeStatus = null;
    this.classList.remove('active');
  } else {
    activeStatus = 'missing';
    this.classList.add('active');
    document.getElementById('filter-owned').classList.remove('active');
  }
  renderGrid();
});

document.getElementById('filter-owned').addEventListener('click', function() {
  if (activeStatus === 'owned') {
    activeStatus = null;
    this.classList.remove('active');
  } else {
    activeStatus = 'owned';
    this.classList.add('active');
    document.getElementById('filter-missing').classList.remove('active');
  }
  renderGrid();
});

function getFilteredStickers() {
  return allStickers.filter(s => {
    if (activeGroup !== 'all' && s.group !== activeGroup) return false;
    if (activeStatus === 'missing' && myCollection.has(s.code)) return false;
    if (activeStatus === 'owned' && !myCollection.has(s.code)) return false;
    if (searchQuery) {
      const q = searchQuery;
      if (!s.code.toLowerCase().includes(q) &&
          !s.name.toLowerCase().includes(q) &&
          !s.country.toLowerCase().includes(q) &&
          !s.group.toLowerCase().includes(q) &&
          !s.page.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

// ══════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    document.getElementById('tab-' + activeTab).classList.add('active');

    // Mostrar/ocultar filtros de status conforme a aba ativa
    const filterStatusColecao = document.getElementById('filter-status-colecao');
    const filterStatusRepetidas = document.getElementById('filter-status-repetidas');
    if (filterStatusColecao) {
      filterStatusColecao.classList.toggle('hidden', activeTab !== 'colecao');
    }
    if (filterStatusRepetidas) {
      filterStatusRepetidas.classList.toggle('hidden', activeTab !== 'repetidas');
    }

    // Ocultar barra de filtro inteira nas abas Admin, Estatísticas e Financeiro
    const filterBar = document.querySelector('.filter-bar');
    if (filterBar) {
      filterBar.style.display = (activeTab === 'admin' || activeTab === 'stats' || activeTab === 'financeiro') ? 'none' : '';
    }

    if (activeTab === 'trocas') loadTradingPanel();
    if (activeTab === 'admin') loadAdminPanel();
    if (activeTab === 'stats') loadStatsPanel();
    if (activeTab === 'financeiro') loadFinancePanel();
  });
});

// Os chips de grupo do topo (data-group) já controlam activeGroup e chamam renderMatchesList via renderGrid/renderDuplicatesGrid
// Quando a aba Trocas está ativa, o filtro de grupo usa activeGroup diretamente

// Filtro Tenho/Faltando na aba Repetidas
document.querySelectorAll('[data-dup-status]').forEach(btn => {
  btn.addEventListener('click', () => {
    const status = btn.dataset.dupStatus;
    if (activeDupStatus === status) {
      // Toggle off
      activeDupStatus = null;
      document.querySelectorAll('[data-dup-status]').forEach(b => b.classList.remove('active'));
    } else {
      activeDupStatus = status;
      document.querySelectorAll('[data-dup-status]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    renderDuplicatesGrid();
  });
});

// Filtro Tenho/Faltando nas Negociações
document.querySelectorAll('.trade-filter-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.trade-filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTradeFilter = btn.dataset.tradeFilter;
    renderMatchesList();
  });
});

function renderMatchesList() {
  const matchesList = document.getElementById('matches-list');
  if (!matchesList) return;
  matchesList.innerHTML = '';
  let matchCount = 0;

  const tradeSearch = (searchQuery || '').toLowerCase();

  // Calcular figurinhas reservadas em propostas pendentes
  const reservedCodes = {}; // { code: qty reservada }
  (window._myPendingProposals || []).forEach(p => {
    (p.offeredCodes || []).forEach(code => {
      reservedCodes[code] = (reservedCodes[code] || 0) + 1;
    });
  });

  const sortedDupEntries = Object.entries(window._tradeDuplicates || myDuplicates)
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  sortedDupEntries.forEach(([code, qty]) => {
    const sticker = allStickers.find(s => s.code === code);
    if (!sticker) return;
    // Aplicar filtro de grupo (usa o mesmo activeGroup dos chips do topo)
    if (activeGroup !== 'all' && sticker.group !== activeGroup) return;
    // Aplicar filtro Tenho/Faltando: "Tenho" = tenho repetida (já filtrado), "Faltando" = não mostrar aqui
    if (activeTradeFilter === 'missing') return; // seção de repetidas não aparece no filtro "Faltando"
    // Aplicar filtro de busca
    if (tradeSearch) {
      const groupLabel = sticker.group === '-' ? 'fifa' : sticker.group === 'CC' ? 'coca-cola' : `grupo ${sticker.group.toLowerCase()}`;
      const searchable = `${sticker.code} ${sticker.name} ${groupLabel} ${sticker.page}`.toLowerCase();
      if (!searchable.includes(tradeSearch)) return;
    }

    const needers = Object.entries(window._tradeOthersCollection || {})
      .filter(([, oSet]) => !oSet.has(code))
      .map(([oUid]) => oUid);

    if (needers.length > 0) {
      matchCount++;
      const groupLabel = sticker.group === '-' ? 'FIFA' : sticker.group === 'CC' ? 'Coca-Cola' : `Grupo ${sticker.group}`;
      const reserved = reservedCodes[code] || 0;
      const available = qty - reserved;
      const card = document.createElement('div');
      card.className = 'trade-card is-match';
      card.innerHTML = `
        <div class="trade-code">${sticker.code}</div>
        <div class="trade-name">${sticker.name}</div>
        <div class="trade-meta">
          <span class="trade-group">${groupLabel}</span>
          <span class="trade-page">Pág. ${sticker.page}</span>
        </div>
        <div class="trade-users">
          <div class="trade-user">
            <span class="trade-user-dot" style="background:var(--gold)"></span>
            <span>Você tem</span>
            <span class="trade-user-qty" style="color:var(--gold);background:var(--gold-dim)">${qty}x</span>
          </div>
          ${reserved > 0 ? `
          <div class="trade-user">
            <span class="trade-user-dot" style="background:var(--red)"></span>
            <span style="color:var(--red)">${reserved}x reservada(s)</span>
            <span class="trade-user-qty" style="color:var(--green);background:var(--green-dim)">${available}x livre</span>
          </div>` : ''}
          ${needers.map(nUid => `
            <div class="trade-user">
              <span class="trade-user-dot blue"></span>
              <span>${(window._tradeUserNames || {})[nUid] || nUid} precisa</span>
            </div>
          `).join('')}
        </div>
      `;
      matchesList.appendChild(card);
    }
  });

  const countEl = document.getElementById('matches-count');
  if (countEl) countEl.textContent = matchCount;

  // Renderizar seção "O que eu preciso"
  renderNeedsList();
}

function renderNeedsList() {
  const needsList = document.getElementById('needs-list');
  if (!needsList) return;
  needsList.innerHTML = '';
  let needsCount = 0;

  const tradeSearch = (searchQuery || '').toLowerCase();
  const othersCollection = window._tradeOthersCollection || {};
  const othersDuplicates = window._tradeOthersDuplicates || {};
  const userNames = window._tradeUserNames || {};

  // Para cada figurinha que eu não tenho, verificar se alguém tem repetida
  allStickers.forEach(sticker => {
    if (myCollection.has(sticker.code)) return; // já tenho
    if (activeGroup !== 'all' && sticker.group !== activeGroup) return;
    // Aplicar filtro Tenho/Faltando: "Tenho" = não mostrar aqui (são faltantes)
    if (activeTradeFilter === 'owned') return;
    if (tradeSearch) {
      const groupLabel = sticker.group === '-' ? 'fifa' : sticker.group === 'CC' ? 'coca-cola' : `grupo ${sticker.group.toLowerCase()}`;
      const searchable = `${sticker.code} ${sticker.name} ${groupLabel} ${sticker.page}`.toLowerCase();
      if (!searchable.includes(tradeSearch)) return;
    }

    // Quem tem essa figurinha como repetida?
    const providers = Object.entries(othersDuplicates)
      .filter(([, dups]) => (dups[sticker.code] || 0) > 0)
      .map(([oUid, dups]) => ({ uid: oUid, qty: dups[sticker.code] }));

    if (providers.length > 0) {
      needsCount++;
      const groupLabel = sticker.group === '-' ? 'FIFA' : sticker.group === 'CC' ? 'Coca-Cola' : `Grupo ${sticker.group}`;
      const card = document.createElement('div');
      card.className = 'trade-card has-match';
      card.innerHTML = `
        <div class="trade-code" style="color:var(--blue)">${sticker.code}</div>
        <div class="trade-name">${sticker.name}</div>
        <div class="trade-meta">
          <span class="trade-group">${groupLabel}</span>
          <span class="trade-page">Pág. ${sticker.page}</span>
        </div>
        <div class="trade-users">
          ${providers.map(p => `
            <div class="trade-user">
              <span class="trade-user-dot" style="background:var(--blue)"></span>
              <span>${userNames[p.uid] || p.uid} tem</span>
              <span class="trade-user-qty" style="color:var(--blue);background:var(--blue-dim)">${p.qty}x</span>
            </div>
          `).join('')}
        </div>
      `;
      needsList.appendChild(card);
    }
  });

  const countEl = document.getElementById('needs-count');
  if (countEl) countEl.textContent = needsCount;
}

// ════════════════════════════════════════════
// CÂMERA OCR
// ════════════════════════════════════════════
document.getElementById('btn-camera').addEventListener('click', () => openCamera());
document.getElementById('btn-close-camera').addEventListener('click', () => closeCamera());
document.getElementById('btn-close-camera-2').addEventListener('click', () => closeCamera());
document.getElementById('btn-capture-photo').addEventListener('click', () => captureAndAnalyze());
modalCamera.addEventListener('click', (e) => { if (e.target === modalCamera) closeCamera(); });

async function openCamera() {
  modalCamera.classList.remove('hidden');
  cameraResult.innerHTML = '';
  const btnCapture = document.getElementById('btn-capture-photo');
  btnCapture.disabled = false;
  btnCapture.textContent = '📸 Fotografar código';
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    cameraVideo.srcObject = cameraStream;
    cameraResult.innerHTML = '<span class="camera-scanning">Aponte para o verso da figurinha e toque em “Fotografar código”</span>';
  } catch (e) {
    console.error('Erro ao abrir câmera:', e);
    cameraResult.innerHTML = `<span class="camera-error">Não foi possível acessar a câmera: ${e.message}. Verifique as permissões do navegador.</span>`;
  }
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
  modalCamera.classList.add('hidden');
}

// Captura o frame atual e envia para Gemini Vision identificar o código
async function captureAndAnalyze() {
  const btnCapture = document.getElementById('btn-capture-photo');
  btnCapture.disabled = true;
  btnCapture.textContent = '⏳ Analisando...';
  cameraResult.innerHTML = '<span class="camera-scanning">Analisando imagem, aguarde...</span>';

  try {
    // Captura frame completo do vídeo
    const canvas = document.createElement('canvas');
    canvas.width  = cameraVideo.videoWidth  || 1280;
    canvas.height = cameraVideo.videoHeight || 720;
    canvas.getContext('2d').drawImage(cameraVideo, 0, 0);
    const base64DataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Envia para OCR.space (API gratuita, sem necessidade de cadastro)
    const formData = new FormData();
    formData.append('apikey', 'helloworld');
    formData.append('base64Image', base64DataUrl);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2'); // Engine 2 é mais precisa para texto impresso

    const resp = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData
    });
    const json = await resp.json();

    if (json.IsErroredOnProcessing) {
      throw new Error(json.ErrorMessage?.[0] || 'Erro no OCR');
    }

    const rawText = json.ParsedResults?.[0]?.ParsedText || '';
    console.log('Texto OCR bruto:', rawText);

    // Normaliza: maiúsculas, remove caracteres estranhos mas mantém letras, números e espaços
    const cleaned = rawText.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // Estratégia 1: tokens juntos (ex: "NED14")
    const tokensJuntos = cleaned.split(' ').filter(t => /^[A-Z]{2,5}[0-9]{1,2}$/.test(t));

    // Estratégia 2: pares adjacentes separados por espaço (ex: "NED 14" → "NED14")
    const words = cleaned.split(' ');
    const tokensPares = [];
    for (let i = 0; i < words.length - 1; i++) {
      const combined = words[i] + words[i+1];
      if (/^[A-Z]{2,5}[0-9]{1,2}$/.test(combined)) tokensPares.push(combined);
    }

    // Estratégia 3: busca direta na string limpa por qualquer código conhecido
    const tokensDirectMatch = allStickers
      .filter(s => cleaned.includes(s.code))
      .map(s => s.code);

    const allTokens = [...new Set([...tokensJuntos, ...tokensPares, ...tokensDirectMatch])];
    console.log('Tokens encontrados:', allTokens, '| Texto limpo:', cleaned);

    let found = null;
    for (const token of allTokens) {
      const sticker = allStickers.find(s => s.code === token);
      if (sticker) { found = sticker; break; }
    }

    if (found) {
      markStickerFromCamera(found);
    } else {
      // Mostra o texto bruto lido para ajudar o usuário a entender o problema
      const preview = cleaned.slice(0, 60) || 'nenhum texto detectado';
      cameraResult.innerHTML = `<span class="camera-error">Não encontrei o código. Texto lido: "${preview}". Enquadre a caixinha preta com o código e tente novamente.</span>`;
      btnCapture.disabled = false;
      btnCapture.textContent = '📸 Tentar novamente';
    }
  } catch (e) {
    cameraResult.innerHTML = `<span class="camera-error">Erro ao analisar imagem: ${e.message}. Verifique sua conexão e tente novamente.</span>`;
    btnCapture.disabled = false;
    btnCapture.textContent = '📸 Tentar novamente';
  }
}

async function markStickerFromCamera(sticker) {
  const wasOwned = myCollection.has(sticker.code);

  if (wasOwned) {
    // Já está na coleção — perguntar se quer adicionar às repetidas
    showCameraConfirm(
      `🔁 <strong>${sticker.code}</strong> — ${sticker.name}`,
      'Essa figurinha já está na sua coleção. Deseja somá-la às repetidas?',
      'Sim, adicionar às repetidas',
      async () => {
        const newQty = (myDuplicates[sticker.code] || 0) + 1;
        myDuplicates[sticker.code] = newQty;
        try {
          await setDoc(doc(db, 'duplicates', getActiveUid()), {
            items: myDuplicates,
            updatedAt: new Date().toISOString()
          });
          updateProgress();
          showToast(`✅ ${sticker.code} adicionada às repetidas (${newQty}x)!`, 'success');
        } catch (e) {
          myDuplicates[sticker.code] = newQty - 1;
          if (myDuplicates[sticker.code] <= 0) delete myDuplicates[sticker.code];
          showToast('Erro ao salvar repetida.', 'error');
        }
      }
    );
  } else {
    // Não está na coleção — perguntar se quer incluir
    showCameraConfirm(
      `✨ <strong>${sticker.code}</strong> — ${sticker.name}`,
      'Figurinha nova! Deseja incluí-la na sua coleção?',
      'Sim, incluir na coleção',
      async () => {
        myCollection.add(sticker.code);
        updateProgress();
        renderGrid();
        try {
          await setDoc(doc(db, 'collections', getActiveUid()), {
            codes: Array.from(myCollection),
            updatedAt: new Date().toISOString()
          });
          showToast(`✅ ${sticker.code} — ${sticker.name} adicionada!`, 'success');
        } catch (e) {
          myCollection.delete(sticker.code);
          updateProgress();
          renderGrid();
          showToast('Erro ao salvar. Tente novamente.', 'error');
        }
      }
    );
  }
}

function showCameraConfirm(title, message, confirmLabel, onConfirm) {
  // Reutilizar o modal da câmera para mostrar confirmação
  const resultEl = document.getElementById('camera-result');
  resultEl.innerHTML = `
    <div class="camera-confirm">
      <div class="camera-confirm-title">${title}</div>
      <div class="camera-confirm-msg">${message}</div>
      <div class="camera-confirm-actions">
        <button class="btn-confirm-yes">${confirmLabel}</button>
        <button class="btn-confirm-no">Cancelar</button>
      </div>
    </div>
  `;
  // Reabrir modal se fechado
  modalCamera.classList.remove('hidden');
  resultEl.querySelector('.btn-confirm-yes').addEventListener('click', () => {
    closeCamera();
    onConfirm();
  });
  resultEl.querySelector('.btn-confirm-no').addEventListener('click', () => {
    closeCamera();
  });
}

// ════════════════════════════════════════════
// MODAL DE COMPARTILHAMENTO
// ════════════════════════════════════════════
const modalShare       = document.getElementById('modal-share');
const shareStep1       = document.getElementById('share-step-1');
const shareStep2       = document.getElementById('share-step-2');
const shareStepGroup   = document.getElementById('share-step-group');
const shareStepCountry = document.getElementById('share-step-country');
const shareStepPreview = document.getElementById('share-step-preview');
const sharePreviewText = document.getElementById('share-preview-text');
const chkMissing       = document.getElementById('chk-missing');
const chkDuplicates    = document.getElementById('chk-duplicates');
const shareNextBtn     = document.getElementById('share-next-step1');
let   shareContext     = null;

// Abrir modal
document.getElementById('btn-share').addEventListener('click', () => openShareModal());

// Fechar modal
document.getElementById('btn-close-share').addEventListener('click', () => closeShareModal());
modalShare.addEventListener('click', (e) => { if (e.target === modalShare) closeShareModal(); });

function openShareModal() {
  // Reset checkboxes
  chkMissing.checked = false;
  chkDuplicates.checked = false;
  shareNextBtn.disabled = true;
  showShareStep('step1');
  modalShare.classList.remove('hidden');

  // Popular lista de grupos (multi-select)
  const groupList = document.getElementById('share-group-list');
  groupList.innerHTML = '';
  const groupConfirmBtn = document.getElementById('share-group-confirm');
  groupConfirmBtn.disabled = true;
  const groups = ['-', ...'ABCDEFGHIJKL'.split(''), 'CC'];
  groups.forEach(g => {
    const label = g === '-' ? 'FIFA' : g === 'CC' ? 'Coca-Cola' : `Grupo ${g}`;
    const lbl = document.createElement('label');
    lbl.className = 'share-checkbox-label share-sub-check';
    lbl.innerHTML = `
      <input type="checkbox" value="${g}" data-label="${label}" />
      <span class="share-checkbox-box"></span>
      <span class="share-checkbox-text"><strong>${label}</strong></span>
    `;
    lbl.querySelector('input').addEventListener('change', () => {
      const checked = groupList.querySelectorAll('input:checked').length;
      groupConfirmBtn.disabled = checked === 0;
    });
    groupList.appendChild(lbl);
  });

  // Popular lista de seleções (multi-select)
  const countryList = document.getElementById('share-country-list');
  countryList.innerHTML = '';
  const countryConfirmBtn = document.getElementById('share-country-confirm');
  countryConfirmBtn.disabled = true;
  const countries = [...new Set(allStickers.map(s => s.country))].sort();
  countries.forEach(c => {
    const lbl = document.createElement('label');
    lbl.className = 'share-checkbox-label share-sub-check';
    lbl.innerHTML = `
      <input type="checkbox" value="${c}" data-label="${c}" />
      <span class="share-checkbox-box"></span>
      <span class="share-checkbox-text"><strong>${c}</strong></span>
    `;
    lbl.querySelector('input').addEventListener('change', () => {
      const checked = countryList.querySelectorAll('input:checked').length;
      countryConfirmBtn.disabled = checked === 0;
    });
    countryList.appendChild(lbl);
  });
}

function closeShareModal() {
  modalShare.classList.add('hidden');
  shareContext = null;
}

function showShareStep(step) {
  [shareStep1, shareStep2, shareStepGroup, shareStepCountry, shareStepPreview]
    .forEach(el => el.classList.add('hidden'));
  if (step === 'step1')   shareStep1.classList.remove('hidden');
  if (step === 'step2')   shareStep2.classList.remove('hidden');
  if (step === 'group')   shareStepGroup.classList.remove('hidden');
  if (step === 'country') shareStepCountry.classList.remove('hidden');
  if (step === 'preview') shareStepPreview.classList.remove('hidden');
}

// Habilitar botão Próximo quando ao menos um checkbox estiver marcado
[chkMissing, chkDuplicates].forEach(chk => {
  chk.addEventListener('change', () => {
    shareNextBtn.disabled = !chkMissing.checked && !chkDuplicates.checked;
  });
});

// Passo 1 → Passo 2
shareNextBtn.addEventListener('click', () => {
  shareContext = {
    includeMissing: chkMissing.checked,
    includeDuplicates: chkDuplicates.checked,
    scope: 'all',
    scopeValue: null,
    scopeLabel: null,
    message: null
  };
  showShareStep('step2');
});

// Navegação entre passos
document.getElementById('share-back-2').addEventListener('click', () => showShareStep('step1'));
document.getElementById('share-back-group').addEventListener('click', () => showShareStep('step2'));
document.getElementById('share-back-country').addEventListener('click', () => showShareStep('step2'));
document.getElementById('share-back-preview').addEventListener('click', () => {
  if (shareContext?.scope === 'group') showShareStep('group');
  else if (shareContext?.scope === 'country') showShareStep('country');
  else showShareStep('step2');
});

// Confirmar seleção de grupos
document.getElementById('share-group-confirm').addEventListener('click', () => {
  const checked = document.querySelectorAll('#share-group-list input:checked');
  const values = [...checked].map(i => i.value);
  const labels = [...checked].map(i => i.dataset.label);
  shareContext.scope = 'group';
  shareContext.scopeValues = values;
  shareContext.scopeLabel = labels.join(', ');
  buildSharePreview();
  showShareStep('preview');
});

// Confirmar seleção de países
document.getElementById('share-country-confirm').addEventListener('click', () => {
  const checked = document.querySelectorAll('#share-country-list input:checked');
  const values = [...checked].map(i => i.value);
  const labels = [...checked].map(i => i.dataset.label);
  shareContext.scope = 'country';
  shareContext.scopeValues = values;
  shareContext.scopeLabel = labels.join(', ');
  buildSharePreview();
  showShareStep('preview');
});

// Opções do passo 2 (escopo)
document.querySelectorAll('[data-scope]').forEach(btn => {
  btn.addEventListener('click', () => {
    const scope = btn.dataset.scope;
    if (scope === 'group') {
      showShareStep('group');
    } else if (scope === 'country') {
      showShareStep('country');
    } else {
      shareContext.scope = 'all';
      buildSharePreview();
      showShareStep('preview');
    }
  });
});

// Helpers de agrupamento
const GROUP_ORDER = ['FIFA', ...'ABCDEFGHIJKL'.split('').map(g => `Grupo ${g}`), 'Coca-Cola'];

// Mapa de bandeiras por país
const COUNTRY_FLAGS = {
  'ALG': '🇩🇿', 'ARG': '🇦🇷', 'AUT': '🇦🇹', 'Australia': '🇦🇺',
  'BEL': '🇧🇪', 'Bosnia and Herzegovina': '🇧🇦', 'Brazil': '🇧🇷',
  'COD': '🇨🇩', 'COL': '🇨🇴', 'CPV': '🇨🇻', 'CRO': '🇭🇷',
  'Canada': '🇨🇦', 'Curaçao': '🇨🇼', 'Czechia': '🇨🇿',
  'EGY': '🇪🇬', 'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'ESP': '🇪🇸', 'Ecuador': '🇪🇨',
  'FIFA World Cup': '🏆', 'FRA': '🇫🇷', 'GHA': '🇬🇭', 'Germany': '🇩🇪',
  'Haiti': '🇭🇹', 'IRN': '🇮🇷', 'IRQ': '🇮🇶', 'Ivory Coast': '🇨🇮',
  'JOR': '🇯🇴', 'Japan': '🇯🇵', 'KAS': '🇰🇿', 'KSA': '🇸🇦',
  'Mexico': '🇲🇽', 'Morocco': '🇲🇦', 'NOR': '🇳🇴', 'NZL': '🇳🇿',
  'Netherlands': '🇳🇱', 'PAN': '🇵🇦', 'POR': '🇵🇹', 'Paraguay': '🇵🇾',
  'Qatar': '🇶🇦', 'SEN': '🇸🇳', 'SWE': '🇸🇪', 'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'South Africa': '🇿🇦', 'South Korea': '🇰🇷', 'Switzerland': '🇨🇭',
  'TUN': '🇹🇳', 'Türkiye': '🇹🇷', 'URU': '🇺🇾', 'USA': '🇺🇸', 'UZB': '🇺🇿',
};

function getFlag(country) {
  return COUNTRY_FLAGS[country] || '';
}

function groupStickers(stickers) {
  const grouped = {};
  stickers.forEach(s => {
    const grp = s.group === '-' ? 'FIFA' : s.group === 'CC' ? 'Coca-Cola' : `Grupo ${s.group}`;
    if (!grouped[grp]) grouped[grp] = [];
    grouped[grp].push(s);
  });
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const ia = GROUP_ORDER.indexOf(a); const ib = GROUP_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  sortedKeys.forEach(k => grouped[k].sort((a, b) => a.code.localeCompare(b.code)));
  return { grouped, sortedKeys };
}

// Agrupa figurinhas por país para a mensagem de compartilhamento
function groupStickersByCountry(stickers) {
  const grouped = {};
  stickers.forEach(s => {
    const key = s.country;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });
  const sortedKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));
  sortedKeys.forEach(k => grouped[k].sort((a, b) => {
    // Extrair número do código para ordenação numérica (ex: ARG1, ARG2, ARG10)
    const numA = parseInt(a.code.replace(/[^0-9]/g, '')) || 0;
    const numB = parseInt(b.code.replace(/[^0-9]/g, '')) || 0;
    return numA - numB;
  }));
  return { grouped, sortedKeys };
}

function buildSharePreview() {
  const name = (currentUser.displayName || currentUser.email).split(' ')[0];
  const { includeMissing, includeDuplicates, scope, scopeValues, scopeLabel } = shareContext;

  // Filtrar por escopo (suporta múltiplos valores)
  let scopeStickers = allStickers;
  let scopeTitle = 'Álbum Completo';
  if (scope === 'group' && scopeValues?.length) {
    scopeStickers = allStickers.filter(s => scopeValues.includes(s.group));
    scopeTitle = scopeLabel;
  } else if (scope === 'country' && scopeValues?.length) {
    scopeStickers = allStickers.filter(s => scopeValues.includes(s.country));
    scopeTitle = scopeLabel;
  }

  let msg = `🏆 *Figurinhas Copa 2026 — ${name}*\n`;
  msg += `_${scopeTitle}_\n\n`;

  let hasContent = false;

  // Formata lista agrupada por país com bandeiras
  // Formato: 🇦🇷 ARG: 1, 2, 5, 10
  // Agrupa por prefixo do código (não por país) para evitar duplicatas
  // Ex: CC6 (COL) e COL6 ficam em grupos separados
  function formatList(stickers) {
    // Agrupar por prefixo do código (ex: ARG, BRA, CC, FWC)
    const byPrefix = {};
    stickers.forEach(s => {
      const prefix = s.code.replace(/[0-9]/g, '').trim();
      if (!byPrefix[prefix]) byPrefix[prefix] = [];
      byPrefix[prefix].push(s);
    });
    const sortedPrefixes = Object.keys(byPrefix).sort();
    let lines = '';
    sortedPrefixes.forEach(prefix => {
      const items = byPrefix[prefix].sort((a, b) => {
        const na = parseInt(a.code.replace(/[^0-9]/g, '')) || 0;
        const nb = parseInt(b.code.replace(/[^0-9]/g, '')) || 0;
        return na - nb;
      });
      // Usar país do primeiro item para a bandeira
      const flag = getFlag(items[0].country);
      const nums = items.map(s => s.code.replace(/[^0-9]/g, '') || s.code).join(', ');
      lines += `${flag} *${prefix}:* ${nums}\n`;
    });
    return lines;
  }

  // Seção: Faltando
  if (includeMissing) {
    const missing = scopeStickers.filter(s => !myCollection.has(s.code));
    if (missing.length > 0) {
      hasContent = true;
      msg += `*⬜ Faltando (${missing.length})*\n`;
      msg += formatList(missing);
      msg += '\n';
    } else {
      msg += `*⬜ Faltando:* nenhuma! 🎉\n\n`;
    }
  }

  // Seção: Repetidas
  if (includeDuplicates) {
    const dups = scopeStickers.filter(s => (myDuplicates[s.code] || 0) > 0);
    if (dups.length > 0) {
      hasContent = true;
      const totalQty = dups.reduce((sum, s) => sum + (myDuplicates[s.code] || 0), 0);
      msg += `*🔄 Repetidas (${totalQty} unidades)*\n`;
      // Para repetidas, mostrar quantidade ao lado do número quando > 1
      // Agrupar por prefixo do código para evitar duplicatas (ex: CC6 e COL6)
      const byPrefix = {};
      dups.forEach(s => {
        const prefix = s.code.replace(/[0-9]/g, '').trim();
        if (!byPrefix[prefix]) byPrefix[prefix] = [];
        byPrefix[prefix].push(s);
      });
      Object.keys(byPrefix).sort().forEach(prefix => {
        const items = byPrefix[prefix].sort((a, b) => {
          const na = parseInt(a.code.replace(/[^0-9]/g, '')) || 0;
          const nb = parseInt(b.code.replace(/[^0-9]/g, '')) || 0;
          return na - nb;
        });
        const flag = getFlag(items[0].country);
        const nums = items.map(s => {
          const num = s.code.replace(/[^0-9]/g, '') || s.code;
          const qty = myDuplicates[s.code] || 1;
          return qty > 1 ? `${num}(${qty}x)` : num;
        }).join(', ');
        msg += `${flag} *${prefix}:* ${nums}\n`;
      });
      msg += '\n';
    } else {
      msg += `*🔄 Repetidas:* nenhuma no momento.\n\n`;
    }
  }

  if (!hasContent) {
    sharePreviewText.value = 'Nenhuma figurinha encontrada para os filtros selecionados.';
    return;
  }

  msg = msg.trimEnd();
  sharePreviewText.value = msg;
  shareContext.message = msg;
}

// Botão enviar WhatsApp
document.getElementById('btn-share-whatsapp-send').addEventListener('click', () => {
  if (!shareContext?.message) return;
  const url = `https://wa.me/?text=${encodeURIComponent(shareContext.message)}`;
  const newWin = window.open(url, '_blank');
  if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
    window.location.href = url;
  }
});

// Botão copiar texto
document.getElementById('btn-share-copy').addEventListener('click', () => {
  if (!shareContext?.message) return;
  navigator.clipboard.writeText(shareContext.message)
    .then(() => showToast('Texto copiado para a área de transferência!', 'success'))
    .catch(() => {
      // Fallback para navegadores sem suporte
      sharePreviewText.select();
      document.execCommand('copy');
      showToast('Texto copiado!', 'success');
    });
});

// ══════════════════════════════════════════════
// RENDER — COLEÇÃO
// ══════════════════════════════════════════════
function renderGrid() {
  const filtered = getFilteredStickers();
  stickerGrid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  // Agrupar por seleção (country) e ordenar alfabeticamente
  const byCountry = {};
  filtered.forEach(s => {
    if (!byCountry[s.country]) byCountry[s.country] = [];
    byCountry[s.country].push(s);
  });
  const sortedCountries = Object.keys(byCountry).sort((a, b) => {
    // FIFA World Cup sempre primeiro
    if (a === 'FIFA World Cup') return -1;
    if (b === 'FIFA World Cup') return 1;
    return a.localeCompare(b, 'pt-BR');
  });

  const frag = document.createDocumentFragment();
  sortedCountries.forEach(country => {
    const stickers = byCountry[country];
    const firstSticker = stickers[0];
    const flag = COUNTRY_FLAGS[country] || '🏳️';
    const group = firstSticker.group && firstSticker.group !== '-' ? `Grupo ${firstSticker.group}` : 'FIFA';
    const ownedCount = stickers.filter(s => myCollection.has(s.code)).length;
    const total = stickers.length;

    const section = document.createElement('div');
    section.className = 'sticker-section';
    section.dataset.country = country;

    const header = document.createElement('div');
    header.className = 'sticker-section-header';
    header.innerHTML = `
      <div class="sticker-section-left">
        <span class="sticker-section-flag">${flag}</span>
        <span class="sticker-section-name">${country}</span>
        <span class="sticker-section-group">${group}</span>
      </div>
      <div class="sticker-section-right">
        <span class="sticker-section-count ${ownedCount === total ? 'complete' : ''}">${ownedCount}/${total}</span>
        <svg class="sticker-section-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'sticker-section-grid';
    stickers.forEach(s => grid.appendChild(createStickerCard(s)));

    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });

    section.appendChild(header);
    section.appendChild(grid);
    frag.appendChild(section);
  });
  stickerGrid.appendChild(frag);
}

// Mapa de bandeiras por país
const COUNTRY_FLAGS = {
  'FIFA World Cup': '🌍',
  'Mexico': '🇲🇽',
  'South Korea': '🇰🇷',
  'South Africa': '🇿🇦',
  'Czechia': '🇨🇿',
  'Canada': '🇨🇦',
  'Bosnia and Herzegovina': '🇧🇦',
  'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭',
  'Brazil': '🇧🇷',
  'Morocco': '🇲🇦',
  'Haiti': '🇭🇹',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'USA': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Australia': '🇦🇺',
  'Türkiye': '🇹🇷',
  'Germany': '🇩🇪',
  'Ivory Coast': '🇨🇮',
  'Ecuador': '🇪🇨',
  'Curaçao': '🇨🇼',
  'Netherlands': '🇳🇱',
  'Japan': '🇯🇵',
  'SWE': '🇸🇪',
  'TUN': '🇹🇳',
  'BEL': '🇧🇪',
  'EGY': '🇪🇬',
  'IRN': '🇮🇷',
  'NZL': '🇳🇿',
  'ESP': '🇪🇸',
  'KSA': '🇸🇦',
  'URU': '🇺🇾',
  'FRA': '🇫🇷',
  'SEN': '🇸🇳',
  'IRQ': '🇮🇶',
  'NOR': '🇳🇴',
  'ARG': '🇦🇷',
  'ALG': '🇩🇿',
  'AUT': '🇦🇹',
  'JOR': '🇯🇴',
  'POR': '🇵🇹',
  'COD': '🇨🇩',
  'COL': '🇨🇴',
  'UZB': '🇺🇿',
  'CRO': '🇭🇷',
  'ENG': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'GHA': '🇬🇭',
  'PAN': '🇵🇦',
  'CPV': '🇨🇻',
  'Colômbia': '🇨🇴',
  'Uruguay': '🇺🇾',
};

function createStickerCard(s) {
  const owned = myCollection.has(s.code);
  const card = document.createElement('div');
  card.className = 'sticker-card' + (owned ? ' owned' : '');
  card.dataset.code = s.code;
  card.innerHTML = `
    <div class="sticker-check">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="2 6 5 9 10 3"/>
      </svg>
    </div>
    <div class="sticker-code">${s.code}</div>
    <div class="sticker-name">${s.name}</div>
  `;
  card.addEventListener('click', () => toggleSticker(s.code, card));
  return card;
}

async function toggleSticker(code, card) {
  const wasOwned = myCollection.has(code);
  // Otimistic update
  if (wasOwned) {
    myCollection.delete(code);
    card.classList.remove('owned');
  } else {
    myCollection.add(code);
    card.classList.add('owned');
  }
  updateProgress();
  // Atualizar contador da seção da seleção
  const section = card.closest('.sticker-section');
  if (section) {
    const countEl = section.querySelector('.sticker-section-count');
    if (countEl) {
      const cards = section.querySelectorAll('.sticker-card');
      const ownedNow = section.querySelectorAll('.sticker-card.owned').length;
      const total = cards.length;
      countEl.textContent = `${ownedNow}/${total}`;
      countEl.classList.toggle('complete', ownedNow === total);
    }
  }

  // Persistir no Firestore
  try {
    const uid = getActiveUid();
    const activeUser = getActiveUser();
    await setDoc(doc(db, 'collections', uid), {
      codes: Array.from(myCollection),
      email: activeUser.email.toLowerCase(),
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    // Reverter em caso de erro
    if (wasOwned) myCollection.add(code);
    else myCollection.delete(code);
    card.classList.toggle('owned', wasOwned);
    updateProgress();
    showToast('Erro ao salvar. Tente novamente.', 'error');
  }
}

// ══════════════════════════════════════════════
// RENDER — REPETIDAS
// ══════════════════════════════════════════════
function renderDuplicatesGrid() {
  let filtered = getFilteredStickers();

  // Aplicar filtro local da aba Repetidas
  if (activeDupStatus === 'owned') {
    filtered = filtered.filter(s => (myDuplicates[s.code] || 0) > 0);
  } else if (activeDupStatus === 'missing') {
    filtered = filtered.filter(s => (myDuplicates[s.code] || 0) === 0);
  }

  stickerGridDup.innerHTML = '';

  if (filtered.length === 0) {
    emptyStateDup.classList.remove('hidden');
    return;
  }
  emptyStateDup.classList.add('hidden');

  // Agrupar por seleção e ordenar alfabeticamente
  const byCountry = {};
  filtered.forEach(s => {
    if (!byCountry[s.country]) byCountry[s.country] = [];
    byCountry[s.country].push(s);
  });
  const sortedCountries = Object.keys(byCountry).sort((a, b) => {
    if (a === 'FIFA World Cup') return -1;
    if (b === 'FIFA World Cup') return 1;
    return a.localeCompare(b, 'pt-BR');
  });

  const frag = document.createDocumentFragment();
  sortedCountries.forEach(country => {
    const stickers = byCountry[country];
    const firstSticker = stickers[0];
    const flag = COUNTRY_FLAGS[country] || '🏳️';
    const group = firstSticker.group && firstSticker.group !== '-' ? `Grupo ${firstSticker.group}` : 'FIFA';
    const dupCount = stickers.filter(s => (myDuplicates[s.code] || 0) > 0).length;
    const total = stickers.length;

    const section = document.createElement('div');
    section.className = 'sticker-section';
    section.dataset.country = country;

    const header = document.createElement('div');
    header.className = 'sticker-section-header';
    header.innerHTML = `
      <div class="sticker-section-left">
        <span class="sticker-section-flag">${flag}</span>
        <span class="sticker-section-name">${country}</span>
        <span class="sticker-section-group">${group}</span>
      </div>
      <div class="sticker-section-right">
        <span class="sticker-section-count ${dupCount > 0 ? 'complete' : ''}">${dupCount}/${total}</span>
        <svg class="sticker-section-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'sticker-section-grid';
    stickers.forEach(s => grid.appendChild(createDupCard(s)));

    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });

    section.appendChild(header);
    section.appendChild(grid);
    frag.appendChild(section);
  });
  stickerGridDup.appendChild(frag);
}

function createDupCard(s) {
  const qty = myDuplicates[s.code] || 0;
  const card = document.createElement('div');
  card.className = 'sticker-card' + (qty > 0 ? ' owned' : '');
  card.dataset.code = s.code;
  card.innerHTML = `
    <div class="sticker-code">${s.code}</div>
    <div class="sticker-name">${s.name}</div>
    <div class="dup-controls">
      <button class="dup-btn" data-action="dec">−</button>
      <span class="dup-qty ${qty > 0 ? 'has-dup' : ''}">${qty}</span>
      <button class="dup-btn" data-action="inc">+</button>
    </div>
  `;

  card.querySelector('[data-action="inc"]').addEventListener('click', (e) => {
    e.stopPropagation();
    updateDuplicate(s.code, (myDuplicates[s.code] || 0) + 1, card);
  });
  card.querySelector('[data-action="dec"]').addEventListener('click', (e) => {
    e.stopPropagation();
    const cur = myDuplicates[s.code] || 0;
    if (cur > 0) updateDuplicate(s.code, cur - 1, card);
  });

  return card;
}

async function updateDuplicate(code, newQty, card) {
  const oldQty = myDuplicates[code] || 0;

  // Optimistic update
  if (newQty <= 0) {
    delete myDuplicates[code];
  } else {
    myDuplicates[code] = newQty;
  }

  const qtyEl = card.querySelector('.dup-qty');
  qtyEl.textContent = newQty;
  qtyEl.className = 'dup-qty' + (newQty > 0 ? ' has-dup' : '');
  card.classList.toggle('owned', newQty > 0);

  // Atualizar contador da seção da seleção
  const section = card.closest('.sticker-section');
  if (section) {
    const countEl = section.querySelector('.sticker-section-count');
    if (countEl) {
      const allCards = section.querySelectorAll('.sticker-card');
      const withDup = [...allCards].filter(c => {
        const qEl = c.querySelector('.dup-qty');
        return qEl && parseInt(qEl.textContent, 10) > 0;
      }).length;
      const total = allCards.length;
      countEl.textContent = `${withDup}/${total}`;
      countEl.classList.toggle('complete', withDup > 0);
    }
  }

  // Atualizar contador do header imediatamente (otimista)
  updateProgress();

  // Persistir
  try {
    const uid = getActiveUid();
    await setDoc(doc(db, 'duplicates', uid), {
      items: myDuplicates,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    // Reverter
    if (oldQty <= 0) delete myDuplicates[code];
    else myDuplicates[code] = oldQty;
    qtyEl.textContent = oldQty;
    qtyEl.className = 'dup-qty' + (oldQty > 0 ? ' has-dup' : '');
    card.classList.toggle('owned', oldQty > 0);
    updateProgress(); // reverter contador
    showToast('Erro ao salvar. Tente novamente.', 'error');
  }
}

// ══════════════════════════════════════════════
// PAINEL DE TROCAS
// ══════════════════════════════════════════════
async function loadTradingPanel() {
  // Garantir que os dados do usuário já foram carregados
  if (!currentUser || !allStickers || allStickers.length === 0) {
    showToast('Aguarde o carregamento da coleção.', '');
    return;
  }
  tradingLoading.style.display = 'flex';
  tradingContent.classList.add('hidden');

  try {
    // Buscar coleções, repetidas e propostas de todos os usuários
    const [colSnaps, dupSnaps, proposalSnaps] = await Promise.all([
      getDocs(collection(db, 'collections')),
      getDocs(collection(db, 'duplicates')),
      getDocs(query(collection(db, 'trade_proposals'),
        where('status', 'in', ['pending', 'accepted', 'refused', 'cancelled'])))
    ]);

    const uid = getActiveUid();

    // Constante: mínimo de figurinhas para ser considerado participante ativo
    const MIN_STICKERS_ACTIVE = 7;

    // Determinar quais UIDs são participantes ativos (coleção + repetidas >= 7)
    const activeUids = new Set();
    const colByUid = {}; // { uid: Set<code> }
    const dupByUid = {}; // { uid: { code: qty } }
    colSnaps.forEach(snap => { colByUid[snap.id] = new Set(snap.data().codes || []); });
    dupSnaps.forEach(snap => { dupByUid[snap.id] = snap.data().items || {}; });

    // Verificar o próprio usuário também (sempre ativo para si mesmo)
    activeUids.add(uid);

    // Para os outros: contar coleção + total de repetidas
    const allUids = new Set([...Object.keys(colByUid), ...Object.keys(dupByUid)]);
    allUids.forEach(u => {
      if (u === uid) return; // já adicionado
      const colCount = (colByUid[u] || new Set()).size;
      const dupCount = Object.values(dupByUid[u] || {}).reduce((s, q) => s + q, 0);
      if (colCount + dupCount >= MIN_STICKERS_ACTIVE) activeUids.add(u);
    });

    // Mapear coleções dos outros usuários ATIVOS
    const othersCollection = {}; // { uid: Set<code> }
    colSnaps.forEach(snap => {
      if (snap.id !== uid && activeUids.has(snap.id)) {
        othersCollection[snap.id] = colByUid[snap.id];
      }
    });

    // Mapear repetidas dos outros usuários ATIVOS
    const othersDuplicates = {}; // { uid: { code: qty } }
    dupSnaps.forEach(snap => {
      if (snap.id !== uid && activeUids.has(snap.id)) {
        othersDuplicates[snap.id] = dupByUid[snap.id];
      }
    });

    // Buscar nomes dos usuários (mapeamento UID → nome via campo uid em authorized_users)
    const userSnaps = await getDocs(collection(db, 'authorized_users'));
    const userNames = {}; // { uid: nome }
    const userList = []; // lista de membros para o modal de proposta (apenas ativos)
    userSnaps.forEach(snap => {
      const data = snap.data();
      const nome = data.name || snap.id;
      if (data.uid) {
        userNames[data.uid] = nome;
        if (data.uid !== uid && activeUids.has(data.uid)) {
          userList.push({ uid: data.uid, name: nome });
        }
      }
      const email = snap.data().email || snap.id;
      userNames[email] = nome;
    });
    colSnaps.forEach(snap => {
      if (!userNames[snap.id]) {
        const colEmail = snap.data().email;
        if (colEmail && userNames[colEmail]) {
          userNames[snap.id] = userNames[colEmail];
        }
      }
    });

    // Separar propostas enviadas e recebidas
    const sentProposals = [];
    const receivedProposals = [];
    proposalSnaps.forEach(snap => {
      const d = { id: snap.id, ...snap.data() };
      if (d.fromUid === uid) sentProposals.push(d);
      else if (d.toUid === uid) receivedProposals.push(d);
    });

    // Armazenar dados globais
    window._tradeDuplicates = myDuplicates;
    window._tradeOthersCollection = othersCollection;
    window._tradeOthersDuplicates = othersDuplicates;
    window._tradeUserNames = userNames;
    window._tradeUserList = userList;
    window._mySentProposals = sentProposals;
    window._myReceivedProposals = receivedProposals;
    window._myPendingProposals = sentProposals.filter(p => p.status === 'pending');

    // Resetar filtro de grupo ao recarregar
    activeTradeGroup = 'all';
    document.querySelectorAll('.filter-chip[data-trade-group]').forEach(b => b.classList.remove('active'));
    const allChip = document.querySelector('.filter-chip[data-trade-group="all"]');
    if (allChip) allChip.classList.add('active');

    // Renderizar
    renderProposals();
    renderMatchesList();

    tradingLoading.style.display = 'none';
    tradingContent.classList.remove('hidden');

  } catch (e) {
    console.error(e);
    tradingLoading.style.display = 'none';
    showToast('Erro ao carregar painel de trocas.', 'error');
  }
}


// ════════════════════════════════════════════
// ESTATÍSTICAS DO GRUPO (aba própria)
// ════════════════════════════════════════════
async function loadStatsPanel() {
  const statsGrid = document.getElementById('stats-grid');
  if (!statsGrid) return;
  statsGrid.innerHTML = '<div class="stats-loading"><div class="spinner"></div><span>Calculando estatísticas…</span></div>';
  try {
    const [colSnaps, dupSnaps] = await Promise.all([
      getDocs(collection(db, 'collections')),
      getDocs(collection(db, 'duplicates'))
    ]);
    renderGroupStats(colSnaps, dupSnaps);
  } catch (e) {
    statsGrid.innerHTML = '<div class="stats-empty">Erro ao carregar estatísticas.</div>';
  }
}

function renderGroupStats(colSnaps, dupSnaps) {
  const statsGrid = document.getElementById('stats-grid');
  if (!statsGrid) return;

  // Constante: mínimo de figurinhas (coleção + repetidas) para ser participante ativo
  const MIN_STICKERS_ACTIVE = 7;

  // Determinar UIDs ativos
  const colByUid = {};
  const dupByUid = {};
  colSnaps.forEach(snap => { colByUid[snap.id] = snap.data().codes || []; });
  dupSnaps.forEach(snap => { dupByUid[snap.id] = snap.data().items || {}; });

  // Garantir que o usuário atual sempre esteja incluído com os dados em memória
  // (evita que ele fique de fora por dessincronização com o Firestore)
  const activeUid = getActiveUid();
  colByUid[activeUid] = [...myCollection];
  dupByUid[activeUid] = myDuplicates;

  const allUids = new Set([...Object.keys(colByUid), ...Object.keys(dupByUid)]);
  const activeUids = new Set();
  allUids.forEach(u => {
    const colCount = (colByUid[u] || []).length;
    const dupCount = Object.values(dupByUid[u] || {}).reduce((s, q) => s + q, 0);
    if (colCount + dupCount >= MIN_STICKERS_ACTIVE) activeUids.add(u);
  });

  const ownerCount = {};
  activeUids.forEach(uid => {
    (colByUid[uid] || []).forEach(code => {
      ownerCount[code] = (ownerCount[code] || 0) + 1;
    });
  });

  const dupCount = {};
  activeUids.forEach(uid => {
    Object.entries(dupByUid[uid] || {}).forEach(([code, qty]) => {
      if (qty > 0) dupCount[code] = (dupCount[code] || 0) + qty;
    });
  });

  const totalParticipants = activeUids.size;

  const topDups = Object.entries(dupCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, qty]) => ({ code, qty, sticker: allStickers.find(s => s.code === code) }))
    .filter(x => x.sticker);

  // Figurinhas mais faltantes: ordenar por mais membros sem ela
  const topNeeded = allStickers
    .map(s => ({ code: s.code, name: s.name, owned: ownerCount[s.code] || 0, missing: totalParticipants - (ownerCount[s.code] || 0), sticker: s }))
    .filter(x => x.missing > 0 && totalParticipants > 0)
    .sort((a, b) => b.missing - a.missing)
    .slice(0, 5);

  // Top 5 repetidas do usuário atual
  const myTopDups = Object.entries(myDuplicates)
    .filter(([, qty]) => qty > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, qty]) => ({ code, qty, sticker: allStickers.find(s => s.code === code) }))
    .filter(x => x.sticker);

  // ── Posições mais ausentes ──
  // Extrai o número de posição do final do código (ex: MEX7 → 7, BRA14 → 14)
  const posRegex = /(\d+)$/;

  // Posições mais ausentes do usuário atual (figurinhas que não possui)
  const myMissingByPos = {};
  allStickers.forEach(s => {
    const m = s.code.match(posRegex);
    if (!m) return;
    const pos = parseInt(m[1], 10);
    if (!myCollection.has(s.code)) {
      myMissingByPos[pos] = (myMissingByPos[pos] || 0) + 1;
    }
  });
  const myTopMissingPos = Object.entries(myMissingByPos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pos, cnt]) => ({ pos: parseInt(pos, 10), cnt }));

  // Posições mais ausentes no grupo (Opção B)
  // Para cada posição, soma quantas figurinhas daquela posição faltam no total para todos os membros ativos
  // Ex: posição 13 tem 50 figurinhas × 6 membros = 300 possíveis; se o grupo tem 180, faltam 120 → exibe 120/300

  // Mapa: posição → lista de códigos daquela posição
  const stickersByPos = {};
  allStickers.forEach(s => {
    const m = s.code.match(posRegex);
    if (!m) return;
    const pos = parseInt(m[1], 10);
    if (!stickersByPos[pos]) stickersByPos[pos] = [];
    stickersByPos[pos].push(s.code);
  });

  const groupMissingByPos = {}; // posição → total de figurinhas faltando no grupo
  const groupTotalByPos = {};   // posição → total possível (stickers_na_posição × membros_ativos)

  Object.entries(stickersByPos).forEach(([posStr, codes]) => {
    const pos = parseInt(posStr, 10);
    let missingCount = 0;
    activeUids.forEach(uid => {
      const userCodes = new Set(colByUid[uid] || []);
      codes.forEach(code => {
        if (!userCodes.has(code)) missingCount++;
      });
    });
    groupMissingByPos[pos] = missingCount;
    groupTotalByPos[pos] = codes.length * activeUids.size;
  });

  const groupTopMissingPos = Object.entries(groupMissingByPos)
    .filter(([, cnt]) => cnt > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pos, cnt]) => ({ pos: parseInt(pos, 10), cnt, total: groupTotalByPos[parseInt(pos, 10)] }));

  // Verificar se o usuário atual é admin sem impersonação (não tem coleção própria)
  const isAdminNoImpersonation = currentUser && ADMIN_EMAILS.includes(currentUser.email) && !impersonatedUser;

  statsGrid.innerHTML = `
    ${!isAdminNoImpersonation ? `
    <div class="stats-col stats-col-personal">
      <div class="stats-col-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Minhas mais repetidas
      </div>
      ${myTopDups.length === 0
        ? '<div class="stats-empty">Nenhuma repetida registrada ainda.</div>'
        : myTopDups.map((x, i) => `
          <div class="stats-row">
            <span class="stats-rank">${i + 1}</span>
            <div class="stats-info">
              <span class="stats-code">${x.code}</span>
              <span class="stats-name">${x.sticker.name}</span>
            </div>
            <span class="stats-value gold">${x.qty}x</span>
          </div>
        `).join('')
      }
    </div>
    <div class="stats-col stats-col-personal">
      <div class="stats-col-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Minhas posições mais ausentes
      </div>
      ${myTopMissingPos.length === 0
        ? '<div class="stats-empty">Coleção completa ou sem dados.</div>'
        : myTopMissingPos.map((x, i) => `
          <div class="stats-row">
            <span class="stats-rank">${i + 1}</span>
            <div class="stats-info">
              <span class="stats-code">Posição ${x.pos}</span>
              <span class="stats-name">${x.cnt} figurinha${x.cnt !== 1 ? 's' : ''} faltando</span>
            </div>
            <span class="stats-value gold">${x.cnt}x</span>
          </div>
        `).join('')
      }
    </div>
    ` : ''}
    <div class="stats-col">
      <div class="stats-col-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        Mais repetidas no grupo
      </div>
      ${topDups.length === 0
        ? '<div class="stats-empty">Nenhuma repetida registrada ainda.</div>'
        : topDups.map((x, i) => `
          <div class="stats-row">
            <span class="stats-rank">${i + 1}</span>
            <div class="stats-info">
              <span class="stats-code">${x.code}</span>
              <span class="stats-name">${x.sticker.name}</span>
            </div>
            <span class="stats-value gold">${x.qty}x</span>
          </div>
        `).join('')
      }
    </div>
    <div class="stats-col">
      <div class="stats-col-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Mais faltantes no grupo
      </div>
      ${topNeeded.length === 0
        ? '<div class="stats-empty">Dados insuficientes ainda.</div>'
        : topNeeded.map((x, i) => `
          <div class="stats-row">
            <span class="stats-rank">${i + 1}</span>
            <div class="stats-info">
              <span class="stats-code">${x.code}</span>
              <span class="stats-name">${x.sticker.name}</span>
            </div>
            <span class="stats-value blue">${x.missing}/${totalParticipants}</span>
          </div>
        `).join('')
      }
    </div>
    <div class="stats-col">
      <div class="stats-col-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        Posições mais ausentes no grupo
      </div>
      ${groupTopMissingPos.length === 0
        ? '<div class="stats-empty">Dados insuficientes ainda.</div>'
        : groupTopMissingPos.map((x, i) => `
          <div class="stats-row">
            <span class="stats-rank">${i + 1}</span>
            <div class="stats-info">
              <span class="stats-code">Posição ${x.pos}</span>
              <span class="stats-name">${x.cnt} figurinha${x.cnt !== 1 ? 's' : ''} faltando no grupo</span>
            </div>
            <span class="stats-value blue">${x.cnt}/${x.total}</span>
          </div>
        `).join('')
      }
    </div>
  `;
}

// ══════════════════════════════════════════════
// PAINEL DE ADMINISTRAÇÃO
// ══════════════════════════════════════════════
async function loadAdminPanel() {
  if (!ADMIN_EMAILS.includes(currentUser.email.toLowerCase())) return;

  // Carregar lista de usuários para seleção de impersonação
  const selectLoadingEl = document.getElementById('admin-select-loading');
  if (selectLoadingEl) selectLoadingEl.style.display = 'flex';

  // Carregar lista de gerenciamento
  const listEl = document.getElementById('admin-users-list');
  const loadingEl = document.getElementById('admin-loading');
  loadingEl.style.display = 'flex';

  try {
    const snap = await getDocs(collection(db, 'authorized_users'));
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    users.sort((a, b) => a.id.localeCompare(b.id));
    renderAdminUsers(users);
    renderAdminUserSelectList(users);
  } catch (e) {
    showToast('Erro ao carregar usuários.', 'error');
  } finally {
    loadingEl.style.display = 'none';
    if (selectLoadingEl) selectLoadingEl.style.display = 'none';
  }

  // Configurar botão de adicionar — usar flag para evitar múltiplos listeners
  const btnAdd = document.getElementById('btn-add-user');
  if (!btnAdd._listenerAttached) {
    btnAdd.addEventListener('click', addUser);
    btnAdd._listenerAttached = true;
  }
  document.getElementById('admin-email-input').onkeydown = (e) => { if (e.key === 'Enter') addUser(); };
  document.getElementById('admin-name-input').onkeydown = (e) => { if (e.key === 'Enter') addUser(); };

  // Configurar botão de parar impersonação
  const btnStop = document.getElementById('btn-stop-impersonate');
  if (btnStop && !btnStop._listenerAttached) {
    btnStop.addEventListener('click', stopImpersonation);
    btnStop._listenerAttached = true;
  }
}

function renderAdminUserSelectList(users) {
  const listEl = document.getElementById('admin-user-select-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  // Filtrar: não mostrar o próprio admin na lista de impersonação
  const otherUsers = users.filter(u => !ADMIN_EMAILS.includes(u.id.toLowerCase()));

  if (otherUsers.length === 0) {
    listEl.innerHTML = '<div class="admin-empty">Nenhum usuário cadastrado ainda.</div>';
    return;
  }

  otherUsers.forEach(user => {
    const btn = document.createElement('button');
    btn.className = 'admin-user-select-btn' + (impersonatedUser && impersonatedUser.email === user.id ? ' active' : '');
    const initials = (user.name || user.id).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const avatarHtml = user.photoURL
      ? `<div class="admin-user-select-avatar" style="padding:0;overflow:hidden"><img src="${user.photoURL}" alt="${initials}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.textContent='${initials}'"></div>`
      : `<div class="admin-user-select-avatar">${initials}</div>`;
    btn.innerHTML = `
      ${avatarHtml}
      <div class="admin-user-select-info">
        <div class="admin-user-select-name">${user.name || '(sem nome)'}</div>
        <div class="admin-user-select-email">${user.id}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    `;
    btn.addEventListener('click', () => startImpersonation(user));
    listEl.appendChild(btn);
  });
}

async function startImpersonation(user) {
  if (!user.uid) {
    showToast('Este usuário ainda não fez login no app. O UID não está disponível.', 'error');
    return;
  }

  // Salvar usuário real se ainda não foi salvo
  if (!realUser) realUser = currentUser;

  impersonatedUser = {
    uid: user.uid,
    name: user.name || user.id,
    email: user.id,
    photoURL: user.photoURL || null
  };

  // Atualizar banner
  const banner = document.getElementById('admin-impersonate-banner');
  const bannerName = document.getElementById('admin-impersonate-name');
  if (banner) banner.classList.remove('hidden');
  if (bannerName) bannerName.textContent = impersonatedUser.name;

  // Atualizar header com foto/nome do usuário impersonado
  updateHeader({
    displayName: impersonatedUser.name,
    email: impersonatedUser.email,
    photoURL: impersonatedUser.photoURL
  });

  // Mostrar abas e elementos de coleção (admin está operando como outro usuário)
  document.getElementById('tab-btn-colecao').classList.remove('hidden');
  document.getElementById('tab-btn-repetidas').classList.remove('hidden');
  document.getElementById('dup-count-header').classList.remove('hidden');
  document.getElementById('missing-count-header').classList.remove('hidden');
  document.getElementById('btn-export-pdf').classList.remove('hidden');
  updateShareLinkVisibility();

  // Carregar dados do usuário impersonado
  loadingOverlay.style.display = 'flex';
  try {
    const uid = impersonatedUser.uid;
    const [colSnap, dupSnap] = await Promise.all([
      getDoc(doc(db, 'collections', uid)),
      getDoc(doc(db, 'duplicates', uid))
    ]);
    myCollection = new Set(colSnap.exists() ? (colSnap.data().codes || []) : []);
    myDuplicates = dupSnap.exists() ? (dupSnap.data().items || {}) : {};
    updateProgress();
    renderGrid();
    renderDuplicatesGrid();
    showToast(`✅ Operando como ${impersonatedUser.name}`, 'success');
    // Navegar para aba coleção para ver os dados do usuário
    document.querySelector('.tab-btn[data-tab="colecao"]').click();
  } catch (e) {
    showToast('Erro ao carregar dados do usuário.', 'error');
  } finally {
    loadingOverlay.style.display = 'none';
  }
}

async function stopImpersonation() {
  if (!realUser) return;

  impersonatedUser = null;

  // Restaurar banner
  const banner = document.getElementById('admin-impersonate-banner');
  if (banner) banner.classList.add('hidden');

  // Restaurar header com dados do admin
  updateHeader(realUser);

  // Ocultar abas e elementos de coleção (admin voltou para a própria conta)
  document.getElementById('tab-btn-colecao').classList.add('hidden');
  document.getElementById('tab-btn-repetidas').classList.add('hidden');
  document.getElementById('dup-count-header').classList.add('hidden');
  document.getElementById('missing-count-header').classList.add('hidden');
  document.getElementById('btn-export-pdf').classList.add('hidden');
  updateShareLinkVisibility();

  // Recarregar dados do admin
  loadingOverlay.style.display = 'flex';
  try {
    const uid = realUser.uid;
    const [colSnap, dupSnap] = await Promise.all([
      getDoc(doc(db, 'collections', uid)),
      getDoc(doc(db, 'duplicates', uid))
    ]);
    myCollection = new Set(colSnap.exists() ? (colSnap.data().codes || []) : []);
    myDuplicates = dupSnap.exists() ? (dupSnap.data().items || {}) : {};
    updateProgress();
    renderGrid();
    renderDuplicatesGrid();
    showToast('Voltou para sua própria conta.', 'success');
    document.querySelector('.tab-btn[data-tab="admin"]').click();
  } catch (e) {
    showToast('Erro ao restaurar dados.', 'error');
  } finally {
    loadingOverlay.style.display = 'none';
  }
}

function renderAdminUsers(users) {
  const listEl = document.getElementById('admin-users-list');
  const loadingEl = document.getElementById('admin-loading');
  listEl.innerHTML = '';
  listEl.appendChild(loadingEl);
  loadingEl.style.display = 'none';

  if (users.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'admin-empty';
    empty.textContent = 'Nenhum usuário autorizado ainda.';
    listEl.appendChild(empty);
    return;
  }

  users.forEach(user => {
    const row = document.createElement('div');
    row.className = 'admin-user-row';
    row.dataset.id = user.id;
    const isAdmin = ADMIN_EMAILS.includes(user.id.toLowerCase());
    row.innerHTML = `
      <div class="admin-user-info">
        <div class="admin-user-email">${user.id} ${isAdmin ? '<span class="admin-badge">admin</span>' : ''}</div>
        <div class="admin-user-name">${user.name || '—'}</div>
      </div>
      <button class="btn-remove-user" data-id="${user.id}" ${isAdmin ? 'disabled title="Não é possível remover o admin"' : ''}>Remover</button>
    `;
    listEl.appendChild(row);
  });

  listEl.querySelectorAll('.btn-remove-user:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => removeUser(btn.dataset.id));
  });
}

async function addUser() {
  const emailInput = document.getElementById('admin-email-input');
  const nameInput = document.getElementById('admin-name-input');
  const email = emailInput.value.trim().toLowerCase();
  const name = nameInput.value.trim();

  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    showToast('Digite um email válido.', 'error');
    emailInput.focus();
    return;
  }

  // Buscar o botão atual (pode ter sido recriado por cloneNode)
  const btn = document.getElementById('btn-add-user');
  btn.disabled = true;
  btn.textContent = 'Adicionando…';

  try {
    await setDoc(doc(db, 'authorized_users', email), {
      email: email,
      name: name || '',
      addedAt: new Date().toISOString(),
      addedBy: currentUser.email
    });
    emailInput.value = '';
    nameInput.value = '';
    showToast(`✅ ${email} adicionado com sucesso!`, 'success');
    // Recarregar lista sem recriar o botão (evita perder referência)
    await reloadAdminUsersList();
  } catch (e) {
    showToast('Erro ao adicionar usuário.', 'error');
  } finally {
    // Resetar botão atual (não o clonado)
    const currentBtn = document.getElementById('btn-add-user');
    currentBtn.disabled = false;
    currentBtn.textContent = 'Adicionar';
  }
}

// Recarrega apenas a lista de usuários sem reconfigurar os listeners do formulário
async function reloadAdminUsersList() {
  const loadingEl = document.getElementById('admin-loading');
  loadingEl.style.display = 'flex';
  try {
    const snap = await getDocs(collection(db, 'authorized_users'));
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    users.sort((a, b) => a.id.localeCompare(b.id));
    renderAdminUsers(users);
  } catch (e) {
    showToast('Erro ao recarregar lista.', 'error');
  } finally {
    loadingEl.style.display = 'none';
  }
}

async function removeUser(email) {
  if (!confirm(`Remover acesso de ${email}?`)) return;
  try {
    await deleteDoc(doc(db, 'authorized_users', email));
    showToast(`❌ ${email} removido.`, '');
    const row = document.querySelector(`.admin-user-row[data-id="${email}"]`);
    if (row) row.remove();
  } catch (e) {
    showToast('Erro ao remover usuário.', 'error');
  }
}

// ══════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}


// ══════════════════════════════════════════════
// MÓDULO DE PROPOSTAS DE TROCA
// ══════════════════════════════════════════════

// ── Estado do modal de proposta ──────────────
let proposalState = {
  type: null,       // 'member' | 'external'
  partnerUid: null,
  partnerName: null,
  offeredCodes: [],
  requestedCodes: [],
};

// ── Elementos do modal ───────────────────────
const modalProposal = document.getElementById('modal-proposal');

function openProposalModal() {
  proposalState = { type: null, partnerUid: null, partnerName: null, offeredCodes: [], requestedCodes: [] };
  showProposalStep('type');
  modalProposal.classList.remove('hidden');
}

function closeProposalModal() {
  modalProposal.classList.add('hidden');
}

function showProposalStep(step) {
  ['type','member','external','build','confirm'].forEach(s => {
    document.getElementById(`proposal-step-${s}`).classList.add('hidden');
  });
  document.getElementById(`proposal-step-${step}`).classList.remove('hidden');
}

document.getElementById('btn-new-proposal').addEventListener('click', () => {
  if (!currentUser) return;
  openProposalModal();
});

document.getElementById('btn-close-proposal').addEventListener('click', closeProposalModal);
modalProposal.addEventListener('click', e => { if (e.target === modalProposal) closeProposalModal(); });

// Tipo: membro
document.getElementById('proposal-type-member').addEventListener('click', () => {
  proposalState.type = 'member';
  proposalState.subtype = 'trade'; // padrão: troca
  proposalState.saleRole = null;
  proposalState.saleValue = 0;
  // Resetar seleção de subtipo
  document.querySelectorAll('.member-subtype-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('member-subtype-trade').classList.add('active');
  document.getElementById('member-sale-fields').classList.add('hidden');
  document.getElementById('member-sale-value').value = '';
  document.querySelectorAll('[data-member-role]').forEach(b => b.classList.remove('active'));
  buildMemberList();
  showProposalStep('member');
});

// Subtipo para membro (troca / venda)
document.querySelectorAll('.member-subtype-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.member-subtype-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    proposalState.subtype = btn.dataset.subtype;
    const saleFields = document.getElementById('member-sale-fields');
    if (proposalState.subtype === 'sale') {
      saleFields.classList.remove('hidden');
    } else {
      saleFields.classList.add('hidden');
      proposalState.saleRole = null;
      proposalState.saleValue = 0;
    }
  });
});

// Papel (vendedor/comprador) para membro
document.querySelectorAll('[data-member-role]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-member-role]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    proposalState.saleRole = btn.dataset.memberRole;
  });
});

document.getElementById('member-sale-value').addEventListener('input', function() {
  proposalState.saleValue = parseFloat(this.value) || 0;
});

// Tipo: avulsa
document.getElementById('proposal-type-external').addEventListener('click', () => {
  proposalState.type = 'external';
  proposalState.subtype = 'trade'; // padrão: troca
  proposalState.saleRole = null;
  proposalState.saleValue = 0;
  document.getElementById('proposal-external-name').value = '';
  document.getElementById('proposal-external-next').disabled = true;
  // Resetar seleção de subtipo
  document.querySelectorAll('.external-subtype-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('external-subtype-trade').classList.add('active');
  document.getElementById('external-sale-fields').classList.add('hidden');
  document.getElementById('external-sale-value').value = '';
  document.querySelectorAll('[data-role]').forEach(b => b.classList.remove('active'));
  showProposalStep('external');
});

// Selecionar subtipo (troca / venda)
document.querySelectorAll('.external-subtype-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.external-subtype-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    proposalState.subtype = btn.dataset.subtype;
    const saleFields = document.getElementById('external-sale-fields');
    if (proposalState.subtype === 'sale') {
      saleFields.classList.remove('hidden');
    } else {
      saleFields.classList.add('hidden');
      proposalState.saleRole = null;
      proposalState.saleValue = 0;
    }
    checkExternalNextBtn();
  });
});

// Selecionar papel (vendedor/comprador)
document.querySelectorAll('[data-role]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-role]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    proposalState.saleRole = btn.dataset.role;
    checkExternalNextBtn();
  });
});

document.getElementById('external-sale-value').addEventListener('input', function() {
  proposalState.saleValue = parseFloat(this.value) || 0;
  checkExternalNextBtn();
});

function checkExternalNextBtn() {
  const nameOk = document.getElementById('proposal-external-name').value.trim().length >= 2;
  const saleOk = proposalState.subtype === 'trade' ||
    (proposalState.saleRole && proposalState.saleValue > 0);
  document.getElementById('proposal-external-next').disabled = !(nameOk && saleOk);
}

// Voltar do membro
document.getElementById('proposal-back-member').addEventListener('click', () => showProposalStep('type'));

// Voltar do externo
document.getElementById('proposal-back-external').addEventListener('click', () => showProposalStep('type'));

// Habilitar botão próximo no externo
document.getElementById('proposal-external-name').addEventListener('input', function() {
  checkExternalNextBtn();
});

// Próximo no externo → ir para build
document.getElementById('proposal-external-next').addEventListener('click', () => {
  proposalState.partnerName = document.getElementById('proposal-external-name').value.trim();
  proposalState.partnerUid = null;
  buildProposalLists();
  showProposalStep('build');
});

// Voltar do build
document.getElementById('proposal-back-build').addEventListener('click', () => {
  if (proposalState.type === 'member') showProposalStep('member');
  else showProposalStep('external');
});

// Voltar do confirm
document.getElementById('proposal-back-confirm').addEventListener('click', () => showProposalStep('build'));

function buildMemberList() {
  const list = document.getElementById('proposal-member-list');
  list.innerHTML = '';
  const members = window._tradeUserList || [];
  if (members.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">Nenhum outro membro encontrado.</p>';
    return;
  }
  members.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'proposal-member-btn';
    btn.innerHTML = `
      <span class="proposal-member-avatar">${m.name.charAt(0).toUpperCase()}</span>
      <span class="proposal-member-name">${m.name}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    `;
    btn.addEventListener('click', () => {
      proposalState.partnerUid = m.uid;
      proposalState.partnerName = m.name;
      buildProposalLists();
      showProposalStep('build');
    });
    list.appendChild(btn);
  });
}

function getAvailableQty(code) {
  const total = myDuplicates[code] || 0;
  const reserved = (window._myPendingProposals || [])
    .reduce((sum, p) => sum + (p.offeredCodes || []).filter(c => c === code).length, 0);
  return total - reserved;
}

function buildProposalLists() {
  // Info do parceiro
  const partnerInfo = document.getElementById('proposal-partner-info');
  partnerInfo.innerHTML = `<div class="proposal-partner-badge">
    <span class="proposal-member-avatar" style="width:28px;height:28px;font-size:0.85rem">${proposalState.partnerName.charAt(0).toUpperCase()}</span>
    <span>${proposalState.partnerName}</span>
    ${proposalState.type === 'external' ? '<span class="proposal-external-tag">Externo</span>' : ''}
  </div>`;

  // Resetar seleções
  proposalState.offeredCodes = [];
  proposalState.requestedCodes = [];
  updateBuildCounts();

  // Listas de oferta (minhas repetidas que o parceiro não tem)
  const offerList = document.getElementById('proposal-offer-list');
  offerList.innerHTML = '';

  const partnerCollection = proposalState.partnerUid
    ? (window._tradeOthersCollection || {})[proposalState.partnerUid] || new Set()
    : new Set();

  const myDupCodes = Object.entries(myDuplicates)
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  let offerCount = 0;
  myDupCodes.forEach(([code, qty]) => {
    // Para membro: só mostrar se o parceiro não tem
    if (proposalState.type === 'member' && partnerCollection.has(code)) return;
    const available = getAvailableQty(code);
    if (available <= 0) return; // tudo reservado
    const sticker = allStickers.find(s => s.code === code);
    if (!sticker) return;
    offerCount++;
    const item = createChecklistItem(code, sticker, available, 'offer');
    offerList.appendChild(item);
  });

  if (offerCount === 0) {
    offerList.innerHTML = '<p class="proposal-empty">Nenhuma figurinha disponível para oferecer.</p>';
  }

  // Lista do que quero (repetidas do parceiro que eu não tenho)
  const wantList = document.getElementById('proposal-want-list');
  wantList.innerHTML = '';

  if (proposalState.type === 'member' && proposalState.partnerUid) {
    const partnerDups = (window._tradeOthersDuplicates || {})[proposalState.partnerUid] || {};
    const wantEntries = Object.entries(partnerDups)
      .filter(([code, qty]) => qty > 0 && !myCollection.has(code))
      .sort(([a], [b]) => a.localeCompare(b));

    let wantCount = 0;
    wantEntries.forEach(([code, qty]) => {
      const sticker = allStickers.find(s => s.code === code);
      if (!sticker) return;
      wantCount++;
      const item = createChecklistItem(code, sticker, qty, 'want');
      wantList.appendChild(item);
    });

    if (wantCount === 0) {
      wantList.innerHTML = '<p class="proposal-empty">Parceiro não tem repetidas que você precisa.</p>';
    }
  } else {
    // Troca avulsa: mostrar todas as minhas faltantes para o usuário selecionar
    const missing = allStickers.filter(s => !myCollection.has(s.code))
      .sort((a, b) => a.code.localeCompare(b.code));
    missing.forEach(sticker => {
      const item = createChecklistItem(sticker.code, sticker, 1, 'want');
      wantList.appendChild(item);
    });
    if (missing.length === 0) {
      wantList.innerHTML = '<p class="proposal-empty">Você já tem todas as figurinhas! 🎉</p>';
    }
  }

  // Wires de busca nas colunas
  const offerSearchEl = document.getElementById('offer-search');
  const wantSearchEl = document.getElementById('want-search');
  if (offerSearchEl) {
    offerSearchEl.value = '';
    offerSearchEl.oninput = function() {
      const q = this.value.trim().toLowerCase();
      offerList.querySelectorAll('.proposal-check-item').forEach(item => {
        const code = item.dataset.code || '';
        const name = item.querySelector('.proposal-check-name')?.textContent.toLowerCase() || '';
        item.style.display = (!q || code.toLowerCase().includes(q) || name.includes(q)) ? '' : 'none';
      });
    };
  }
  if (wantSearchEl) {
    wantSearchEl.value = '';
    wantSearchEl.oninput = function() {
      const q = this.value.trim().toLowerCase();
      wantList.querySelectorAll('.proposal-check-item').forEach(item => {
        const code = item.dataset.code || '';
        const name = item.querySelector('.proposal-check-name')?.textContent.toLowerCase() || '';
        item.style.display = (!q || code.toLowerCase().includes(q) || name.includes(q)) ? '' : 'none';
      });
    };
  }
}

function createChecklistItem(code, sticker, qty, side) {
  const groupLabel = sticker.group === '-' ? 'FIFA' : sticker.group === 'CC' ? 'CC' : sticker.group;
  const div = document.createElement('label');
  div.className = 'proposal-check-item';
  div.dataset.code = code;
  div.dataset.side = side;
  div.innerHTML = `
    <input type="checkbox" value="${code}" />
    <span class="proposal-check-box"></span>
    <span class="proposal-check-info">
      <span class="proposal-check-code">${code}</span>
      <span class="proposal-check-name">${sticker.name}</span>
    </span>
    <span class="proposal-check-qty">${qty}x</span>
  `;
  div.querySelector('input').addEventListener('change', e => {
    if (side === 'offer') {
      if (e.target.checked) proposalState.offeredCodes.push(code);
      else proposalState.offeredCodes = proposalState.offeredCodes.filter(c => c !== code);
    } else {
      if (e.target.checked) proposalState.requestedCodes.push(code);
      else proposalState.requestedCodes = proposalState.requestedCodes.filter(c => c !== code);
    }
    updateBuildCounts();
  });
  return div;
}

function updateBuildCounts() {
  document.getElementById('offer-count').textContent = proposalState.offeredCodes.length;
  document.getElementById('want-count').textContent = proposalState.requestedCodes.length;
  const hasAny = proposalState.offeredCodes.length > 0 || proposalState.requestedCodes.length > 0;
  document.getElementById('proposal-build-next').disabled = !hasAny;
}

// Próximo no build → confirmar
document.getElementById('proposal-build-next').addEventListener('click', () => {
  buildProposalSummary();
  showProposalStep('confirm');
});

function buildProposalSummary() {
  const summary = document.getElementById('proposal-summary');
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const formatList = codes => codes.map(code => {
    const s = allStickers.find(x => x.code === code);
    return `<li><strong>${code}</strong>${s ? ' · ' + s.name : ''}</li>`;
  }).join('');

  summary.innerHTML = `
    <div class="proposal-summary-header">
      <span>Parceiro: <strong>${proposalState.partnerName}</strong></span>
      <span class="proposal-summary-date">${dateStr}</span>
    </div>
    ${proposalState.offeredCodes.length > 0 ? `
    <div class="proposal-summary-section offer">
      <div class="proposal-summary-label">Você oferece (${proposalState.offeredCodes.length})</div>
      <ul class="proposal-summary-list">${formatList(proposalState.offeredCodes)}</ul>
    </div>` : ''}
    ${proposalState.requestedCodes.length > 0 ? `
    <div class="proposal-summary-section want">
      <div class="proposal-summary-label">Você quer receber (${proposalState.requestedCodes.length})</div>
      <ul class="proposal-summary-list">${formatList(proposalState.requestedCodes)}</ul>
    </div>` : ''}
  `;
}

// WhatsApp da proposta
document.getElementById('proposal-btn-whatsapp').addEventListener('click', () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const myName = (currentUser.displayName || currentUser.email).split(' ')[0];

  let msg = `🏆 *Proposta de Troca — Copa 2026*\n`;
  msg += `📅 ${dateStr}\n\n`;
  msg += `Olá ${proposalState.partnerName}! Fiz uma oferta de troca no nosso app 👇\n\n`;

  if (proposalState.offeredCodes.length > 0) {
    msg += `*Eu ofereço para você:*\n`;
    proposalState.offeredCodes.forEach(code => {
      const s = allStickers.find(x => x.code === code);
      msg += `• ${code}${s ? ' · ' + s.name : ''}\n`;
    });
    msg += '\n';
  }

  if (proposalState.requestedCodes.length > 0) {
    msg += `*Eu quero de você:*\n`;
    proposalState.requestedCodes.forEach(code => {
      const s = allStickers.find(x => x.code === code);
      msg += `• ${code}${s ? ' · ' + s.name : ''}\n`;
    });
    msg += '\n';
  }

  msg += `_App Figurinhas Copa 2026_`;

  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const newWin = window.open(url, '_blank');
  if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
    window.location.href = url;
  }
});

// Enviar proposta
document.getElementById('proposal-btn-send').addEventListener('click', async () => {
  const btn = document.getElementById('proposal-btn-send');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const uid = getActiveUid();
    const activeUser = getActiveUser();
    const myName = activeUser.displayName || activeUser.email;
    const now = new Date();

    const proposalData = {
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
      status: 'pending',
      fromUid: uid,
      fromName: myName,
      toUid: proposalState.partnerUid || null,
      toName: proposalState.partnerName,
      type: proposalState.type,
      subtype: proposalState.subtype || 'trade', // 'trade' | 'sale'
      saleRole: proposalState.saleRole || null,  // 'seller' | 'buyer'
      saleValue: proposalState.saleValue || 0,
      offeredCodes: proposalState.offeredCodes,
      requestedCodes: proposalState.requestedCodes,
      confirmedAt: null,
    };

    await addDoc(collection(db, 'trade_proposals'), proposalData);

    closeProposalModal();
    showToast('Proposta enviada com sucesso!', 'success');

    // Recarregar painel
    await loadTradingPanel();

  } catch (e) {
    console.error(e);
    showToast('Erro ao enviar proposta.', 'error');
    btn.disabled = false;
    btn.textContent = 'Enviar Proposta';
  }
});

// ── Filtro de status das propostas ──────────────────────────
document.querySelectorAll('.prop-filter-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.prop-filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeProposalStatus = btn.dataset.status || 'all';
    renderProposals();
  });
});

// ── Colapso das seções de propostas ──────────────────────────
// Fechar todas as seções colapsáveis por padrão
document.querySelectorAll('.collapsible-section').forEach(section => {
  section.classList.add('collapsed');
});
document.querySelectorAll('.collapsible-header').forEach(header => {
  header.addEventListener('click', () => {
    const section = header.closest('.collapsible-section');
    section.classList.toggle('collapsed');
  });
});

// ── Renderizar propostas enviadas e recebidas ──────────────
function renderProposals() {
  renderSentProposals();
  renderReceivedProposals();
}

function filterByStatus(proposals) {
  if (activeProposalStatus === 'all') return proposals;
  return proposals.filter(p => p.status === activeProposalStatus);
}

function formatProposalDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const date = d.toLocaleDateString('pt-BR');
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${date} ${time}`;
}

function renderSentProposals() {
  const list = document.getElementById('sent-proposals-list');
  if (!list) return;
  list.innerHTML = '';

  const all = (window._mySentProposals || [])
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const proposals = filterByStatus(all);

  const countEl = document.getElementById('sent-proposals-count');
  if (countEl) countEl.textContent = all.length;

  const sectionEl = document.getElementById('section-sent-proposals');
  if (sectionEl) sectionEl.style.display = all.length === 0 ? 'none' : '';

  if (proposals.length === 0) {
    list.innerHTML = '<div class="proposals-empty">Nenhuma proposta encontrada para este filtro.</div>';
  } else {
    proposals.forEach(p => list.appendChild(createProposalCard(p, 'sent')));
  }
}

function renderReceivedProposals() {
  const list = document.getElementById('received-proposals-list');
  if (!list) return;
  list.innerHTML = '';

  const all = (window._myReceivedProposals || [])
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const proposals = filterByStatus(all);

  const pending = all.filter(p => p.status === 'pending');
  const countEl = document.getElementById('received-proposals-count');
  if (countEl) countEl.textContent = pending.length || '';

  const sectionEl = document.getElementById('section-received-proposals');
  if (sectionEl) sectionEl.style.display = all.length === 0 ? 'none' : '';

  if (proposals.length === 0) {
    list.innerHTML = '<div class="proposals-empty">Nenhuma proposta encontrada para este filtro.</div>';
  } else {
    proposals.forEach(p => list.appendChild(createProposalCard(p, 'received')));
  }
}

const STATUS_LABELS = {
  pending: { label: 'Pendente', cls: 'status-pending' },
  accepted: { label: 'Aceita', cls: 'status-accepted' },
  refused: { label: 'Recusada', cls: 'status-refused' },
  cancelled: { label: 'Cancelada', cls: 'status-cancelled' },
};

function createProposalCard(p, side) {
  const card = document.createElement('div');
  card.className = 'proposal-card';
  const st = STATUS_LABELS[p.status] || STATUS_LABELS.pending;
  const dateTimeStr = formatProposalDateTime(p.createdAt);
  const partner = side === 'sent' ? p.toName : p.fromName;
  const typeTag = p.type === 'external' ? '<span class="proposal-external-tag">Avulsa</span>' : '';

  // Exibir TODAS as figurinhas (sem truncar)
  const offerCodes = (p.offeredCodes || []);
  const wantCodes = (p.requestedCodes || []);
  const offerSummary = offerCodes.join(', ') || '—';
  const wantSummary = wantCodes.join(', ') || '—';

  card.innerHTML = `
    <div class="proposal-card-header" style="cursor:pointer">
      <div class="proposal-card-partner">
        <span class="proposal-member-avatar" style="width:24px;height:24px;font-size:0.75rem">${(partner || '?').charAt(0).toUpperCase()}</span>
        <span>${partner || 'Desconhecido'}</span>
        ${typeTag}
      </div>
      <div class="proposal-card-meta">
        <span class="proposal-status ${st.cls}">${st.label}</span>
        <span class="proposal-card-date">${dateTimeStr}</span>
      </div>
    </div>
    <div class="proposal-card-body">
      ${offerCodes.length > 0 ? `<div class="proposal-card-row"><span class="proposal-card-label offer">Oferece (${offerCodes.length})</span><span class="proposal-card-codes">${offerSummary}</span></div>` : ''}
      ${wantCodes.length > 0 ? `<div class="proposal-card-row"><span class="proposal-card-label want">Quer (${wantCodes.length})</span><span class="proposal-card-codes">${wantSummary}</span></div>` : ''}
    </div>
    <div class="proposal-card-actions" id="actions-${p.id}"></div>
  `;

  // Clicar no header abre o modal de detalhes
  card.querySelector('.proposal-card-header').addEventListener('click', () => openProposalDetailModal(p, side));

  const actionsEl = card.querySelector(`#actions-${p.id}`);

  if (side === 'sent' && p.status === 'pending') {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-proposal-cancel';
    cancelBtn.textContent = 'Cancelar proposta';
    cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cancelProposal(p.id); });
    actionsEl.appendChild(cancelBtn);
  }

  if (side === 'sent' && p.type === 'external' && p.status === 'pending') {
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-proposal-accept';
    confirmBtn.textContent = '✓ Confirmar troca realizada';
    confirmBtn.addEventListener('click', (e) => { e.stopPropagation(); confirmExternalTrade(p); });
    actionsEl.appendChild(confirmBtn);
  }

  if (side === 'received' && p.status === 'pending') {
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'btn-proposal-accept';
    acceptBtn.textContent = '✓ Aceitar';
    acceptBtn.addEventListener('click', (e) => { e.stopPropagation(); acceptProposal(p); });

    const refuseBtn = document.createElement('button');
    refuseBtn.className = 'btn-proposal-cancel';
    refuseBtn.textContent = '✗ Recusar';
    refuseBtn.addEventListener('click', (e) => { e.stopPropagation(); refuseProposal(p.id); });

    actionsEl.appendChild(acceptBtn);
    actionsEl.appendChild(refuseBtn);
  }

  return card;
}

// ── Modal de detalhes da proposta ──────────────────────────
function openProposalDetailModal(p, side) {
  const modal = document.getElementById('modal-proposal-detail');
  const titleEl = document.getElementById('proposal-detail-title');
  const contentEl = document.getElementById('proposal-detail-content');
  const actionsEl = document.getElementById('proposal-detail-actions');
  if (!modal) return;

  const st = STATUS_LABELS[p.status] || STATUS_LABELS.pending;
  const partner = side === 'sent' ? p.toName : p.fromName;
  const dateTimeStr = formatProposalDateTime(p.createdAt);
  const confirmedStr = p.confirmedAt ? formatProposalDateTime(p.confirmedAt) : null;
  const typeLabel = p.type === 'external' ? 'Avulsa' : 'Entre membros';
  const uid = getActiveUid();

  // Verificar se o usuário pode cancelar esta proposta
  const canCancel = p.status === 'pending' && (
    p.fromUid === uid || p.toUid === uid || (p.type === 'external' && p.fromUid === uid)
  );
  const canAccept = side === 'received' && p.status === 'pending';
  const canConfirmExternal = side === 'sent' && p.type === 'external' && p.status === 'pending';

  titleEl.textContent = side === 'sent' ? 'Proposta Enviada' : 'Proposta Recebida';

  // Renderizar figurinhas com nome
  function stickerList(codes) {
    if (!codes || codes.length === 0) return '<span class="detail-empty">—</span>';
    return codes.map(code => {
      const s = allStickers.find(x => x.code === code);
      return `<span class="detail-sticker-tag"><strong>${code}</strong>${s ? ' — ' + s.name : ''}</span>`;
    }).join('');
  }

  contentEl.innerHTML = `
    <div class="detail-meta-row">
      <span class="proposal-status ${st.cls}">${st.label}</span>
      <span class="detail-type-tag">${typeLabel}</span>
    </div>
    <div class="detail-info-row">
      <span class="detail-label">Parceiro</span>
      <span class="detail-value">${partner || 'Desconhecido'}</span>
    </div>
    <div class="detail-info-row">
      <span class="detail-label">Criada em</span>
      <span class="detail-value">${dateTimeStr}</span>
    </div>
    ${confirmedStr ? `<div class="detail-info-row"><span class="detail-label">Confirmada em</span><span class="detail-value">${confirmedStr}</span></div>` : ''}
    <div class="detail-stickers-section">
      <div class="detail-stickers-group">
        <div class="detail-stickers-title offer">Oferece (${(p.offeredCodes || []).length})</div>
        <div class="detail-stickers-list">${stickerList(p.offeredCodes)}</div>
      </div>
      <div class="detail-stickers-group">
        <div class="detail-stickers-title want">Quer (${(p.requestedCodes || []).length})</div>
        <div class="detail-stickers-list">${stickerList(p.requestedCodes)}</div>
      </div>
    </div>
  `;

  actionsEl.innerHTML = '';

  if (canAccept) {
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'btn-proposal-accept';
    acceptBtn.textContent = '✓ Aceitar troca';
    acceptBtn.addEventListener('click', () => { closeProposalDetailModal(); acceptProposal(p); });
    actionsEl.appendChild(acceptBtn);

    const refuseBtn = document.createElement('button');
    refuseBtn.className = 'btn-proposal-cancel';
    refuseBtn.textContent = '✗ Recusar';
    refuseBtn.addEventListener('click', () => { closeProposalDetailModal(); refuseProposal(p.id); });
    actionsEl.appendChild(refuseBtn);
  }

  if (canConfirmExternal) {
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-proposal-accept';
    confirmBtn.textContent = '✓ Confirmar troca realizada';
    confirmBtn.addEventListener('click', () => { closeProposalDetailModal(); confirmExternalTrade(p); });
    actionsEl.appendChild(confirmBtn);
  }

  if (canCancel) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-proposal-cancel';
    cancelBtn.textContent = 'Cancelar proposta';
    cancelBtn.addEventListener('click', () => { closeProposalDetailModal(); cancelProposal(p.id); });
    actionsEl.appendChild(cancelBtn);
  }

  modal.classList.remove('hidden');
}

function closeProposalDetailModal() {
  const modal = document.getElementById('modal-proposal-detail');
  if (modal) modal.classList.add('hidden');
}

// Fechar modal ao clicar no X ou fora
document.getElementById('proposal-detail-close')?.addEventListener('click', closeProposalDetailModal);
document.getElementById('modal-proposal-detail')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeProposalDetailModal();
});

async function cancelProposal(proposalId) {
  try {
    await updateDoc(doc(db, 'trade_proposals', proposalId), {
      status: 'cancelled',
      updatedAt: Date.now(),
    });
    showToast('Proposta cancelada.', '');
    await loadTradingPanel();
  } catch (e) {
    showToast('Erro ao cancelar proposta.', 'error');
  }
}

async function refuseProposal(proposalId) {
  try {
    await updateDoc(doc(db, 'trade_proposals', proposalId), {
      status: 'refused',
      updatedAt: Date.now(),
    });
    showToast('Proposta recusada.', '');
    await loadTradingPanel();
  } catch (e) {
    showToast('Erro ao recusar proposta.', 'error');
  }
}

async function acceptProposal(proposal) {
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Processando...'; }

  try {
    // uid do receptor (pode ser usuário impersonado pelo admin)
    const uid = getActiveUid();

    await runTransaction(db, async (tx) => {
      const myColRef = doc(db, 'collections', uid);
      const myDupRef = doc(db, 'duplicates', uid);
      const theirColRef = doc(db, 'collections', proposal.fromUid);
      const theirDupRef = doc(db, 'duplicates', proposal.fromUid);
      const proposalRef = doc(db, 'trade_proposals', proposal.id);

      const [myColSnap, myDupSnap, theirColSnap, theirDupSnap] = await Promise.all([
        tx.get(myColRef), tx.get(myDupRef), tx.get(theirColRef), tx.get(theirDupRef)
      ]);

      const myCodes = new Set(myColSnap.data()?.codes || []);
      const myDups = myDupSnap.data()?.items || {};
      const theirCodes = new Set(theirColSnap.data()?.codes || []);
      const theirDups = theirDupSnap.data()?.items || {};

      // Verificar conflito: alguma figurinha que vou receber já existe na coleção?
      for (const code of (proposal.offeredCodes || [])) {
        if (myCodes.has(code)) {
          throw new Error(`Conflito: o usuário já tem a figurinha ${code}.`);
        }
      }

      // Receptor recebe: offeredCodes do fromUid → entram na coleção
      for (const code of (proposal.offeredCodes || [])) {
        myCodes.add(code);
        // Sair das repetidas do fromUid
        if ((theirDups[code] || 0) > 0) {
          theirDups[code] = Math.max(0, theirDups[code] - 1);
          if (theirDups[code] === 0) delete theirDups[code];
        }
      }

      // fromUid recebe: requestedCodes → entram na coleção dele
      for (const code of (proposal.requestedCodes || [])) {
        theirCodes.add(code);
        // Sair das repetidas do receptor
        if ((myDups[code] || 0) > 0) {
          myDups[code] = Math.max(0, myDups[code] - 1);
          if (myDups[code] === 0) delete myDups[code];
        }
      }

      tx.set(myColRef, { codes: [...myCodes] }, { merge: true });
      tx.set(myDupRef, { items: myDups }, { merge: true });
      tx.set(theirColRef, { codes: [...theirCodes] }, { merge: true });
      tx.set(theirDupRef, { items: theirDups }, { merge: true });
      tx.update(proposalRef, { status: 'accepted', confirmedAt: Date.now(), updatedAt: Date.now() });
    });

    // Cancelar propostas conflitantes (fora da transação)
    await cancelConflictingProposals(proposal.offeredCodes || []);

    showToast('Negociação aceita! Coleções atualizadas. 🎉', 'success');

    // Registrar movimento financeiro se for venda/compra entre membros
    if (proposal.subtype === 'sale' && proposal.saleValue > 0) {
      const uid = getActiveUid(); // receptor (quem aceitou)
      const isRecipientSeller = proposal.saleRole === 'buyer'; // se quem enviou era comprador, quem aceita é vendedor
      const partnerName = proposal.fromName || 'Parceiro';
      const codesLabel = (proposal.offeredCodes || []).join(', ') || '';

      // Movimento para o receptor (quem aceitou)
      await addFinanceMovementFromTrade({
        type: isRecipientSeller ? 'income' : 'expense',
        value: proposal.saleValue,
        description: `${isRecipientSeller ? 'Venda' : 'Compra'} para ${partnerName}${codesLabel ? ': ' + codesLabel : ''}`,
        uid,
      });

      // Movimento para o remetente (quem criou a proposta) — salvo com o uid do fromUid
      if (proposal.fromUid) {
        const fromIsIncome = proposal.saleRole === 'seller';
        await addFinanceMovementFromTrade({
          type: fromIsIncome ? 'income' : 'expense',
          value: proposal.saleValue,
          description: `${fromIsIncome ? 'Venda' : 'Compra'} para ${getActiveUser()?.displayName || 'Parceiro'}${codesLabel ? ': ' + codesLabel : ''}`,
          uid: proposal.fromUid,
        });
      }
      showToast(`Financeiro atualizado nos dois lados: R$ ${proposal.saleValue.toFixed(2).replace('.', ',')}`, 'success');
    }

    // Atualizar estado local (reflete no grid imediatamente)
    for (const code of (proposal.offeredCodes || [])) {
      myCollection.add(code);
    }
    for (const code of (proposal.requestedCodes || [])) {
      if ((myDuplicates[code] || 0) > 0) {
        myDuplicates[code]--;
        if (myDuplicates[code] === 0) delete myDuplicates[code];
      }
    }
    updateProgressBar();
    await loadTradingPanel();

  } catch (e) {
    console.error('acceptProposal error:', e);
    if (btn) { btn.disabled = false; btn.textContent = '✓ Aceitar'; }
    showToast(e.message || 'Erro ao aceitar proposta.', 'error');
  }
}

async function confirmExternalTrade(proposal) {
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Processando...'; }

  try {
    const uid = getActiveUid();
    const myColRef = doc(db, 'collections', uid);
    const myDupRef = doc(db, 'duplicates', uid);
    const proposalRef = doc(db, 'trade_proposals', proposal.id);

    await runTransaction(db, async (tx) => {
      const [myColSnap, myDupSnap] = await Promise.all([tx.get(myColRef), tx.get(myDupRef)]);
      const myCodes = new Set(myColSnap.data()?.codes || []);
      const myDups = { ...(myDupSnap.data()?.items || {}) };

      // Recebo: requestedCodes entram na minha coleção
      for (const code of (proposal.requestedCodes || [])) {
        myCodes.add(code);
      }
      // Ofereço: offeredCodes saem das minhas repetidas
      for (const code of (proposal.offeredCodes || [])) {
        if (myDups[code] > 0) {
          myDups[code] = Math.max(0, (myDups[code] || 1) - 1);
          if (myDups[code] === 0) delete myDups[code];
        }
      }

      tx.set(myColRef, { codes: [...myCodes] }, { merge: true });
      tx.set(myDupRef, { items: myDups }, { merge: true });
      tx.update(proposalRef, { status: 'accepted', confirmedAt: Date.now(), updatedAt: Date.now() });
    });

    // Cancelar propostas conflitantes
    await cancelConflictingProposals(proposal.requestedCodes || []);

    showToast('Troca avulsa confirmada! Coleção atualizada. 🎉', 'success');

    // Registrar movimento financeiro se for venda/compra
    if (proposal.subtype === 'sale' && proposal.saleValue > 0) {
      const isIncome = proposal.saleRole === 'seller'; // vendedor recebe
      const partnerLabel = proposal.toName || proposal.fromName || 'Parceiro';
      const codesLabel = (proposal.offeredCodes || []).join(', ') || (proposal.requestedCodes || []).join(', ');
      const desc = `${isIncome ? 'Venda' : 'Compra'} avulsa para ${partnerLabel}${codesLabel ? ': ' + codesLabel : ''}`;
      await addFinanceMovementFromTrade({
        type: isIncome ? 'income' : 'expense',
        value: proposal.saleValue,
        description: desc,
      });
      showToast(`Movimento financeiro registrado: ${isIncome ? '+' : '-'} R$ ${proposal.saleValue.toFixed(2).replace('.', ',')}`, 'success');
    }

    // Atualizar estado local
    for (const code of (proposal.requestedCodes || [])) {
      myCollection.add(code);
    }
    for (const code of (proposal.offeredCodes || [])) {
      if (myDuplicates[code] > 0) {
        myDuplicates[code]--;
        if (myDuplicates[code] === 0) delete myDuplicates[code];
      }
    }
    updateProgressBar();
    await loadTradingPanel();

  } catch (e) {
    console.error(e);
    if (btn) { btn.disabled = false; btn.textContent = '✓ Confirmar troca realizada'; }
    showToast(e.message || 'Erro ao confirmar troca.', 'error');
  }
}

async function cancelConflictingProposals(receivedCodes) {
  if (!receivedCodes || receivedCodes.length === 0) return;
  const uid = getActiveUid();
  // Buscar propostas pendentes onde eu pedi as mesmas figurinhas
  const pendingSnaps = await getDocs(query(
    collection(db, 'trade_proposals'),
    where('toUid', '==', uid),
    where('status', '==', 'pending')
  ));
  const batch = writeBatch(db);
  let count = 0;
  pendingSnaps.forEach(snap => {
    const d = snap.data();
    const conflict = (d.offeredCodes || []).some(c => receivedCodes.includes(c));
    if (conflict) {
      batch.update(snap.ref, { status: 'cancelled', updatedAt: Date.now() });
      count++;
    }
  });
  if (count > 0) {
    await batch.commit();
    showToast(`${count} proposta(s) cancelada(s) automaticamente por conflito.`, '');
  }
}

function updateProgressBar() {
  const total = allStickers.length;
  const owned = myCollection.size;
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  if (progressFill) progressFill.style.width = pct + '%';
  if (progressText) progressText.textContent = `${owned} / ${total}`;
  if (progressPct) progressPct.textContent = pct + '%';
}



// ══════════════════════════════════════════════
// EXPORTAÇÃO PDF — CONTROLE DO ÁLBUM v2
// ══════════════════════════════════════════════

// Mapa completo: código ISO → nome em português
const TEAM_NAMES_PT = {
  ALG: 'Argélia', ARG: 'Argentina', AUS: 'Austrália', AUT: 'Áustria',
  BEL: 'Bélgica', BIH: 'Bósnia e Herz.', BRA: 'Brasil', CAN: 'Canadá',
  CC: 'Figurinhas Coca-Cola', CIV: 'Costa do Marfim', COD: 'Congo',
  COL: 'Colômbia', CPV: 'Cabo Verde', CRO: 'Croácia', CUW: 'Curaçao',
  CZE: 'Rep. Tcheca', ECU: 'Equador', EGY: 'Egito', ENG: 'Inglaterra',
  ESP: 'Espanha', FRA: 'França', FWC: 'FIFA World Cup History',
  GER: 'Alemanha', GHA: 'Gana', HAI: 'Haiti', IRN: 'Irã',
  IRQ: 'Iraque', JOR: 'Jordânia', JPN: 'Japão', KOR: 'Coreia do Sul',
  KSA: 'Arábia Saudita', MAR: 'Marrocos', MEX: 'México', NED: 'Holanda',
  NOR: 'Noruega', NZL: 'Nova Zelândia', PAN: 'Panamá', PAR: 'Paraguai',
  POR: 'Portugal', QAT: 'Catar', RSA: 'África do Sul', SCO: 'Escócia',
  SEN: 'Senegal', SUI: 'Suíça', SWE: 'Suécia', SWI: 'Suíça',
  TUN: 'Tunísia', TUR: 'Turquia', URU: 'Uruguai', USA: 'Estados Unidos',
  UZB: 'Uzbequistão',
};

// Mapa código → código ISO 2 letras para flagcdn.com
const TEAM_FLAG_ISO = {
  ALG: 'dz', ARG: 'ar', AUS: 'au', AUT: 'at',
  BEL: 'be', BIH: 'ba', BRA: 'br', CAN: 'ca',
  CIV: 'ci', COD: 'cd', COL: 'co', CPV: 'cv',
  CRO: 'hr', CUW: 'cw', CZE: 'cz', ECU: 'ec',
  EGY: 'eg', ENG: 'gb-eng', ESP: 'es', FRA: 'fr',
  GER: 'de', GHA: 'gh', HAI: 'ht', IRN: 'ir',
  IRQ: 'iq', JOR: 'jo', JPN: 'jp', KOR: 'kr',
  KSA: 'sa', MAR: 'ma', MEX: 'mx', NED: 'nl',
  NOR: 'no', NZL: 'nz', PAN: 'pa', PAR: 'py',
  POR: 'pt', QAT: 'qa', RSA: 'za', SCO: 'gb-sct',
  SEN: 'sn', SUI: 'ch', SWE: 'se', SWI: 'ch',
  TUN: 'tn', TUR: 'tr', URU: 'uy', USA: 'us',
  UZB: 'uz',
};

// Abrir modal de seleção de modo PDF
document.getElementById('btn-export-pdf').addEventListener('click', () => {
  document.getElementById('modal-pdf-mode').classList.remove('hidden');
});
document.getElementById('btn-close-pdf-mode').addEventListener('click', () => {
  document.getElementById('modal-pdf-mode').classList.add('hidden');
});
document.getElementById('modal-pdf-mode').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-pdf-mode')) {
    document.getElementById('modal-pdf-mode').classList.add('hidden');
  }
});
document.querySelectorAll('.pdf-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('modal-pdf-mode').classList.add('hidden');
    exportAlbumPDF(btn.dataset.mode);
  });
});

async function exportAlbumPDF(pdfMode = 'full') {
  if (!allStickers || allStickers.length === 0) {
    showToast('Aguarde o carregamento das figurinhas.', 'error');
    return;
  }

  showToast('Gerando PDF, aguarde… (carregando bandeiras)', 'info');

  try {
    const { jsPDF } = window.jspdf;

    const activeUser = getActiveUser();
    const userName = activeUser.displayName || activeUser.email?.split('@')[0] || 'Usuário';
    const now = new Date();
    const today = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const totalOwned = myCollection ? myCollection.size : 0;
    const totalStickers = allStickers.length;
    const totalMissing = totalStickers - totalOwned;
    const pct = Math.round((totalOwned / totalStickers) * 100);

    // Carregar foto do usuário (impersonado ou real)
    let userPhotoDataUrl = null;
    const photoURL = impersonatedUser?.photoURL || activeUser.photoURL;
    if (photoURL) {
      try { userPhotoDataUrl = await loadImageAsDataUrl(photoURL); } catch (_) {}
    }

    // ── Construir lista de times ordenada ──
    const teamMap = {};
    allStickers.forEach(s => {
      const m = s.code.match(/^([A-Z]+)/);
      if (!m) return;
      const tc = m[1];
      if (!teamMap[tc]) {
        teamMap[tc] = { code: tc, country: s.country, group: s.group, stickers: [] };
      }
      teamMap[tc].stickers.push(s);
    });

    if (teamMap['SUI'] && teamMap['SWI']) {
      teamMap['SUI'].stickers = [...teamMap['SUI'].stickers, ...teamMap['SWI'].stickers]
        .sort((a, b) => parseInt(a.code.replace(/^[A-Z]+/, '')) - parseInt(b.code.replace(/^[A-Z]+/, '')));
      delete teamMap['SWI'];
    }

    const teams = Object.values(teamMap);
    const regular = teams.filter(t => t.group !== '-' && t.group !== 'CC')
      .sort((a, b) => (TEAM_NAMES_PT[a.code] || a.code).localeCompare(TEAM_NAMES_PT[b.code] || b.code, 'pt'));
    const fwc = teams.filter(t => t.group === '-');
    const cc = teams.filter(t => t.group === 'CC');
    const orderedTeams = [...regular, ...fwc, ...cc];

    // Pré-carregar bandeiras
    const flagCache = {};
    const flagPromises = orderedTeams.map(async team => {
      const iso = TEAM_FLAG_ISO[team.code];
      if (!iso) return;
      try { flagCache[team.code] = await loadImageAsDataUrl(`https://flagcdn.com/w20/${iso}.png`); } catch (_) {}
    });
    flagCache['FWC'] = FIFA_LOGO_B64;
    flagCache['CC'] = CC_LOGO_B64;
    await Promise.all(flagPromises);

    showToast('Gerando PDF, aguarde… (montando páginas)', 'info');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const baseParams = { userName, today, totalOwned, totalStickers, totalMissing, pct, userPhotoDataUrl, flagCache };

    if (pdfMode === 'full') {
      // ── MODO COMPLETO: página coleção + página repetidas ──
      await drawPDFPageV2(doc, { ...baseParams, teams: orderedTeams, collection: myCollection, duplicates: null,
        pageTitle: 'Controle do Álbum', mode: 'collection', isFirstPage: true });
      doc.addPage();
      await drawPDFPageV2(doc, { ...baseParams, teams: orderedTeams, collection: myCollection, duplicates: myDuplicates || {},
        pageTitle: 'Repetidas para Troca', mode: 'duplicates', isFirstPage: false });

    } else if (pdfMode === 'missing') {
      // ── MODO INTERMEDIÁRIO: apenas seções incompletas + resumo das completas ──
      const incompleteTeams = orderedTeams.filter(team => {
        return team.stickers.some(s => !myCollection.has(s.code));
      });
      const completeTeams = orderedTeams.filter(team => {
        return team.stickers.every(s => myCollection.has(s.code));
      });
      await drawPDFPageV2(doc, { ...baseParams, teams: incompleteTeams, collection: myCollection, duplicates: null,
        pageTitle: 'Faltantes (seções incompletas)', mode: 'collection', isFirstPage: true,
        completedTeamsSummary: completeTeams });

    } else if (pdfMode === 'duplicates') {
      // ── MODO REPETIDAS: apenas seções com repetidas ──
      const teamsWithDups = orderedTeams.filter(team => {
        return team.stickers.some(s => (myDuplicates || {})[s.code] > 0);
      });
      if (teamsWithDups.length === 0) {
        showToast('Você não tem figurinhas repetidas no momento.', 'error');
        return;
      }
      await drawPDFPageV2(doc, { ...baseParams, teams: teamsWithDups, collection: myCollection, duplicates: myDuplicates || {},
        pageTitle: 'Repetidas para Troca', mode: 'duplicates', isFirstPage: true });

    } else if (pdfMode === 'simple') {
      // ── MODO SIMPLES: layout clean, faltantes com números + repetidas com qtd ──
      await drawPDFSimple(doc, { ...baseParams, teams: orderedTeams, collection: myCollection, duplicates: myDuplicates || {} });
    }

    const modeSuffix = { full: 'completo', missing: 'faltantes', duplicates: 'repetidas', simple: 'simples' }[pdfMode] || pdfMode;
    doc.save(`album-copa-2026-${userName.replace(/\s+/g, '-').toLowerCase()}-${modeSuffix}.pdf`);
    showToast('PDF gerado com sucesso!', 'success');
  } catch (e) {
    console.error('Erro ao gerar PDF:', e);
    showToast('Erro ao gerar PDF. Tente novamente.', 'error');
  }
}

async function drawPDFPageV2(doc, { teams, collection, duplicates, pageTitle, userName, today, totalOwned, totalStickers, totalMissing, pct, userPhotoDataUrl, flagCache, mode, completedTeamsSummary }) {
  const pageW = 210;
  const pageH = 297;
  const margin = 5;
  const contentW = pageW - margin * 2;

  // ── Fundo branco ──
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, 'F');

  // ── Cabeçalho branco ──
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, 26, margin + contentW, 26);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text('Planilha de Controle de Figurinhas — Copa do Mundo 2026', pageW / 2, 8, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(pageTitle, pageW / 2, 13.5, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`${userName}  ·  Gerado em ${today}  ·  ${totalOwned}/${totalStickers} (${pct}%)  ·  Faltam: ${totalMissing}`, pageW / 2, 19, { align: 'center' });

  // Foto do usuário (canto superior direito, sem moldura)
  const photoSize = 16;
  const photoX = pageW - margin - photoSize;
  const photoY = 4;
  if (userPhotoDataUrl) {
    try {
      doc.addImage(userPhotoDataUrl, 'JPEG', photoX, photoY, photoSize, photoSize);
    } catch (_) {
      drawPhotoPlaceholderV2(doc, photoX, photoY, photoSize, userName);
    }
  } else {
    drawPhotoPlaceholderV2(doc, photoX, photoY, photoSize, userName);
  }

  // Legenda
  const legX = margin;
  const legY = 20;
  // Legenda: ■ Tenho (N)   □ Falta (N)
  doc.setFillColor(0, 0, 0);
  doc.rect(legX, legY, 7, 3, 'F');
  doc.setFontSize(6);
  doc.setTextColor(60, 60, 60);
  doc.text(`Tenho (${totalOwned})`, legX + 8, legY + 2.3);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.rect(legX + 38, legY, 7, 3, 'FD');
  doc.setFontSize(6);
  doc.setTextColor(60, 60, 60);
  doc.text(`Falta (${totalMissing})`, legX + 46, legY + 2.3);

  // ── Tabela ──
  let y = 28;
  const rowH = 4.0;
  const flagW = 5;
  const flagH = 3.3;
  const labelW = 30;   // nome da seleção
  const codeW = 8;     // código (sigla)
  const halfNums = 10;
  const maxNums = 20;
  // Largura disponível para células numéricas (2 grupos de 10 + 1 coluna de código no meio)
  const numAreaW = contentW - labelW - flagW - codeW * 2;
  const cellW = numAreaW / maxNums;

  // Cabeçalho da tabela
  doc.setFillColor(230, 235, 240);
  doc.rect(margin, y, contentW, rowH, 'F');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 70, 80);
  doc.text('Seleção', margin + flagW + 1, y + rowH - 1.2);
  doc.text('Cód', margin + flagW + labelW + 1, y + rowH - 1.2);
  for (let n = 1; n <= halfNums; n++) {
    const cx = margin + flagW + labelW + codeW + (n - 1) * cellW + cellW / 2;
    doc.text(String(n), cx, y + rowH - 1.2, { align: 'center' });
  }
  doc.text('Cód', margin + flagW + labelW + codeW + halfNums * cellW + 1, y + rowH - 1.2);
  for (let n = halfNums + 1; n <= maxNums; n++) {
    const cx = margin + flagW + labelW + codeW * 2 + (n - 1) * cellW + cellW / 2;
    doc.text(String(n), cx, y + rowH - 1.2, { align: 'center' });
  }
  y += rowH;

  // Linhas dos times
  let rowIndex = 0;
  for (const team of teams) {
    if (y + rowH > pageH - 12) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageW, pageH, 'F');
      y = 8;
    }

    // Fundo alternado: branco e cinza muito leve
    const isEven = rowIndex % 2 === 0;
    doc.setFillColor(isEven ? 255 : 245, isEven ? 255 : 246, isEven ? 255 : 248);
    doc.rect(margin, y, contentW, rowH, 'F');

    // Bandeira
    const flagDataUrl = flagCache[team.code];
    if (flagDataUrl) {
      try {
        doc.addImage(flagDataUrl, 'PNG', margin + 0.5, y + (rowH - flagH) / 2, flagW - 1, flagH);
      } catch (_) {}
    }

    // Nome da seleção
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(30, 30, 30);
    const displayName = TEAM_NAMES_PT[team.code] || team.country || team.code;
    doc.text(displayName.substring(0, 24), margin + flagW + 0.5, y + rowH - 1.2);

    // Determinar range de slots para este time
    // FWC: slots 00..19 (20 figurinhas, posicoes 0..19)
    // CC: slots 1..14 (14 figurinhas)
    // Outros: slots 1..20
    const isFWC = team.code === 'FWC';
    const isCC = team.code === 'CC';
    const startSlot = isFWC ? 0 : 1;
    const endSlot = isCC ? 14 : 20;
    const firstHalfEnd = isFWC ? 9 : 10; // 0-9 ou 1-10
    const secondHalfStart = firstHalfEnd + 1;

    // Código (1ª metade)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 100, 100);
    doc.text(team.code, margin + flagW + labelW + 0.5, y + rowH - 1.2);

    // Células 1ª metade
    for (let n = startSlot; n <= firstHalfEnd; n++) {
      const slotIndex = n - startSlot; // 0-based index
      const cx = margin + flagW + labelW + codeW + slotIndex * cellW;
      const sticker = team.stickers.find(s => {
        const num = parseInt(s.code.replace(/^[A-Z]+/, ''));
        return num === n;
      });
      const displayNum = isFWC && n === 0 ? '00' : String(n);
      if (sticker) {
        drawStickerCellV2(doc, cx, y, cellW, rowH, sticker.code, collection, duplicates, mode, displayNum, rowIndex);
      } else {
        doc.setFillColor(200, 200, 200);
        doc.rect(cx + 0.3, y + 0.3, cellW - 0.6, rowH - 0.6, 'F');
      }
    }

    // Código (2ª metade)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 100, 100);
    doc.text(team.code, margin + flagW + labelW + codeW + (firstHalfEnd - startSlot + 1) * cellW + 0.5, y + rowH - 1.2);

    // Células 2ª metade
    for (let n = secondHalfStart; n <= endSlot; n++) {
      const slotIndex = n - startSlot; // 0-based index
      const cx = margin + flagW + labelW + codeW * 2 + slotIndex * cellW;
      const sticker = team.stickers.find(s => {
        const num = parseInt(s.code.replace(/^[A-Z]+/, ''));
        return num === n;
      });
      const displayNum = String(n);
      if (sticker) {
        drawStickerCellV2(doc, cx, y, cellW, rowH, sticker.code, collection, duplicates, mode, displayNum, rowIndex);
      } else if (n <= endSlot) {
        doc.setFillColor(200, 200, 200);
        doc.rect(cx + 0.3, y + 0.3, cellW - 0.6, rowH - 0.6, 'F');
      }
    }

    // Linha divisória leve
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.line(margin, y + rowH, margin + contentW, y + rowH);

    y += rowH;
    rowIndex++;
  }

  // ── Bloco de resumo das seções completas (modo intermediário) ──
  if (completedTeamsSummary && completedTeamsSummary.length > 0) {
    if (y + 10 > pageH - 14) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageW, pageH, 'F');
      y = 8;
    }
    y += 3;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentW, y);
    y += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(60, 60, 60);
    doc.text(`Seções completas (${completedTeamsSummary.length}):`, margin, y);
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(80, 80, 80);
    const names = completedTeamsSummary.map(t => `${TEAM_NAMES_PT[t.code] || t.code} (${t.code})`).join('  •  ');
    const lines = doc.splitTextToSize(names, contentW);
    doc.text(lines, margin, y);
    y += lines.length * 3.5;
  }

  // ── Rodapé de patrocínio ──
  const footerY = pageH - 11;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(margin, footerY, contentW, 8, 'FD');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Deixe seu patrocínio aqui', pageW / 2, footerY + 4.5, { align: 'center' });
}

// ── MODO SIMPLES: 1 página, bandeira + nome + números faltantes e repetidas ──
async function drawPDFSimple(doc, { teams, collection, duplicates, userName, today, totalOwned, totalStickers, totalMissing, pct, userPhotoDataUrl, flagCache }) {
  const pageW = 210;
  const pageH = 297;
  const margin = 8;
  const contentW = pageW - margin * 2;

  // ── Cabeçalho padrão igual ao mapa geral ──
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text('Planilha de Controle de Figurinhas — Copa do Mundo 2026', pageW / 2, 8, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('Versão Simples', pageW / 2, 13.5, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`${userName}  ·  Gerado em ${today}  ·  ${totalOwned}/${totalStickers} (${pct}%)  ·  Faltam: ${totalMissing}`, pageW / 2, 19, { align: 'center' });

  // Foto do usuário (canto superior direito)
  const photoSize = 16;
  const photoX = pageW - margin - photoSize;
  const photoY = 4;
  if (userPhotoDataUrl) {
    try { doc.addImage(userPhotoDataUrl, 'JPEG', photoX, photoY, photoSize, photoSize); } catch (_) { drawPhotoPlaceholderV2(doc, photoX, photoY, photoSize, userName); }
  } else {
    drawPhotoPlaceholderV2(doc, photoX, photoY, photoSize, userName);
  }

  // Linha separadora
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, 23, margin + contentW, 23);

  // ── Layout: cada linha = bandeira | nome seleção | números ──
  // Colunas: flag(5) + nome(28) + sep(2) + números(resto)
  const flagW = 5;
  const flagH = 3.3;
  const nameW = 28;
  const sepW = 2;
  const numsX = margin + flagW + nameW + sepW;
  const numsW = contentW - flagW - nameW - sepW;
  const rowH = 5.5;   // altura base por seleção

  // Cabeçalho de colunas
  let y = 26;
  doc.setFillColor(230, 235, 240);
  doc.rect(margin, y, contentW, 4, 'F');
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 70, 80);
  doc.text('Seleção', margin + flagW + 1, y + 2.8);
  doc.text('Faltantes  /  Repetidas (qtd)', numsX, y + 2.8);
  y += 5;

  // Linhas por seleção
  let rowBg = false;
  for (const team of teams) {
    const missing = team.stickers.filter(s => !collection.has(s.code));
    const dups = team.stickers.filter(s => (duplicates[s.code] || 0) > 0);
    if (missing.length === 0 && dups.length === 0) continue;

    // Montar texto de números faltantes
    const missingNums = missing.map(s => {
      const n = parseInt(s.code.replace(/^[A-Z]+/, ''));
      return team.code === 'FWC' && n === 0 ? '00' : String(n);
    }).join(' ');

    // Montar texto de repetidas com quantidade
    const dupNums = dups.map(s => {
      const n = parseInt(s.code.replace(/^[A-Z]+/, ''));
      const num = team.code === 'FWC' && n === 0 ? '00' : String(n);
      const qty = duplicates[s.code];
      return qty > 1 ? `${num}(${qty}x)` : num;
    }).join(' ');

    // Combinar: faltantes | repetidas separadas por linha ou barra
    let numsText = '';
    if (missingNums && dupNums) numsText = `F: ${missingNums}   R: ${dupNums}`;
    else if (missingNums) numsText = `F: ${missingNums}`;
    else numsText = `R: ${dupNums}`;

    const numsLines = doc.splitTextToSize(numsText, numsW - 2);
    const lineH = Math.max(rowH, numsLines.length * 3.8 + 2);

    // Verificar se cabe na página
    if (y + lineH > pageH - 14) {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageW, pageH, 'F');
      y = 10;
      rowBg = false;
    }

    // Fundo alternado
    if (rowBg) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y, contentW, lineH, 'F');
    }
    rowBg = !rowBg;

    // Bandeira
    const flagDataUrl = flagCache[team.code];
    if (flagDataUrl) {
      try { doc.addImage(flagDataUrl, 'PNG', margin, y + (lineH - flagH) / 2, flagW, flagH); } catch (_) {}
    }

    // Nome da seleção
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(30, 30, 30);
    const teamName = TEAM_NAMES_PT[team.code] || team.country || team.code;
    const nameLines = doc.splitTextToSize(teamName, nameW - 1);
    doc.text(nameLines, margin + flagW + 1, y + lineH / 2 - (nameLines.length - 1) * 1.8 + 0.5);

    // Números
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(50, 50, 50);
    doc.text(numsLines, numsX, y + lineH / 2 - (numsLines.length - 1) * 1.9 + 0.5);

    // Linha separadora leve
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.15);
    doc.line(margin, y + lineH, margin + contentW, y + lineH);

    y += lineH;
  }

  // Rodapé
  const footerY = pageH - 11;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(margin, footerY, contentW, 8, 'FD');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Deixe seu patrocínio aqui', pageW / 2, footerY + 4.5, { align: 'center' });
}

function drawStickerCellV2(doc, x, y, w, h, code, collection, duplicates, mode, num, rowIndex) {
  const pad = 0.3;
  const cx = x + w / 2;
  // Centralização vertical: jsPDF usa baseline, então ajustamos com metade da altura + offset de baseline
  // Para fonte 4pt em mm: ~1.4mm de altura, baseline offset ~0.35mm por pt
  const centerText = (fontSize) => y + h / 2 + (fontSize * 0.176); // 0.176 ≈ 0.5 * (pt para mm)
  // Cor do número da posição: mais escuro na linha cinza, mais claro na linha branca
  const numColor = (rowIndex % 2 === 0) ? 130 : 100;

  if (mode === 'collection') {
    const owned = collection && collection.has(code);
    if (owned) {
      // Preenchido preto = coletada
      doc.setFillColor(0, 0, 0);
      doc.rect(x + pad, y + pad, w - pad * 2, h - pad * 2, 'F');
    } else {
      // Vazio com número da posição
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(170, 170, 170);
      doc.setLineWidth(0.2);
      doc.rect(x + pad, y + pad, w - pad * 2, h - pad * 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(numColor, numColor, numColor);
      doc.text(String(num), cx, centerText(4), { align: 'center' });
    }
  } else {
    // Modo repetidas
    const qty = duplicates ? (duplicates[code] || 0) : 0;
    if (qty > 0) {
      // Fundo cinza escuro com número da quantidade
      const fontSize = qty > 9 ? 3.5 : 4.5;
      doc.setFillColor(60, 60, 60);
      doc.rect(x + pad, y + pad, w - pad * 2, h - pad * 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(255, 255, 255);
      doc.text(String(qty), cx, centerText(fontSize), { align: 'center' });
    } else {
      // Vazio com número da posição
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(170, 170, 170);
      doc.setLineWidth(0.2);
      doc.rect(x + pad, y + pad, w - pad * 2, h - pad * 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(numColor, numColor, numColor);
      doc.text(String(num), cx, centerText(4), { align: 'center' });
    }
  }
}

function drawPhotoPlaceholderV2(doc, x, y, size, name) {
  doc.setFillColor(33, 38, 45);
  doc.rect(x, y, size, size, 'F');
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(240, 192, 64);
  doc.text(initials, x + size / 2, y + size / 2 + 2, { align: 'center' });
}

async function loadImageAsDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    // Timeout para não travar se a bandeira não carregar
    setTimeout(() => reject(new Error('timeout')), 5000);
    img.src = url;
  });
}

// ══════════════════════════════════════════════
// MÓDULO FINANCEIRO
// ══════════════════════════════════════════════

let financeMovements = []; // cache local dos movimentos
let financeEditingId = null; // ID do movimento sendo editado (null = novo)
let financeSelectedType = null; // 'income' | 'expense'

// ── Abrir modal de novo movimento ─────────────────────────────
document.getElementById('btn-new-finance').addEventListener('click', () => {
  financeEditingId = null;
  financeSelectedType = null;
  document.getElementById('modal-finance-title').textContent = 'Novo Movimento';
  document.getElementById('finance-step-type').classList.remove('hidden');
  document.getElementById('finance-step-form').classList.add('hidden');
  document.getElementById('finance-value').value = '';
  document.getElementById('finance-description').value = '';
  // Data padrão: hoje
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('finance-date').value = today;
  document.getElementById('modal-finance').classList.remove('hidden');
});

document.getElementById('btn-close-finance').addEventListener('click', () => {
  document.getElementById('modal-finance').classList.add('hidden');
});
document.getElementById('modal-finance').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-finance')) {
    document.getElementById('modal-finance').classList.add('hidden');
  }
});

// Escolher tipo
document.getElementById('finance-type-income').addEventListener('click', () => {
  financeSelectedType = 'income';
  showFinanceForm();
});
document.getElementById('finance-type-expense').addEventListener('click', () => {
  financeSelectedType = 'expense';
  showFinanceForm();
});

document.getElementById('finance-back-type').addEventListener('click', () => {
  document.getElementById('finance-step-type').classList.remove('hidden');
  document.getElementById('finance-step-form').classList.add('hidden');
});

function showFinanceForm() {
  document.getElementById('finance-step-type').classList.add('hidden');
  document.getElementById('finance-step-form').classList.remove('hidden');
  const indicator = document.getElementById('finance-type-indicator');
  if (financeSelectedType === 'income') {
    indicator.innerHTML = '<span class="finance-type-badge income">💰 Entrada (Receita)</span>';
  } else {
    indicator.innerHTML = '<span class="finance-type-badge expense">🛒 Saída (Despesa)</span>';
  }
}

// Salvar movimento
document.getElementById('finance-btn-save').addEventListener('click', async () => {
  const valueRaw = parseFloat(document.getElementById('finance-value').value);
  const dateVal = document.getElementById('finance-date').value;
  const desc = document.getElementById('finance-description').value.trim();

  if (!financeSelectedType) {
    showToast('Selecione o tipo do movimento.', 'error');
    return;
  }
  if (isNaN(valueRaw) || valueRaw <= 0) {
    showToast('Informe um valor válido.', 'error');
    return;
  }
  if (!dateVal) {
    showToast('Informe a data.', 'error');
    return;
  }

  const btn = document.getElementById('finance-btn-save');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    const uid = getActiveUid();
    const movData = {
      uid,
      type: financeSelectedType,
      value: valueRaw,
      date: dateVal,
      description: desc,
      createdAt: Date.now(),
      source: 'manual', // 'manual' | 'trade' (para movimentos gerados por trocas)
    };

    if (financeEditingId) {
      // Editar existente
      await updateDoc(doc(db, 'financial_movements', financeEditingId), {
        type: movData.type,
        value: movData.value,
        date: movData.date,
        description: movData.description,
        updatedAt: Date.now(),
      });
      showToast('Movimento atualizado!', 'success');
    } else {
      // Novo
      await addDoc(collection(db, 'financial_movements'), movData);
      showToast('Movimento registrado!', 'success');
    }

    document.getElementById('modal-finance').classList.add('hidden');
    await loadFinancePanel();

  } catch (e) {
    console.error('Erro ao salvar movimento financeiro:', e);
    showToast('Erro ao salvar: ' + (e?.message || 'tente novamente.'), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar Movimento';
  }
});

// ── Carregar painel financeiro ────────────────────────────────
async function loadFinancePanel() {
  const listEl = document.getElementById('finance-list');
  const loadingEl = document.getElementById('finance-loading');
  if (!listEl) return;

  loadingEl.style.display = 'flex';

  try {
    const uid = getActiveUid();
    // Query simples por uid apenas (sem orderBy composto para evitar exigir índice)
    const q = query(
      collection(db, 'financial_movements'),
      where('uid', '==', uid)
    );
    const snap = await getDocs(q);
    financeMovements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Ordenar client-side: data desc, depois createdAt desc
    financeMovements.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    renderFinanceList();
    updateFinanceSummary();
  } catch (e) {
    console.error('Erro ao carregar movimentos financeiros:', e);
    listEl.innerHTML = '<p style="color:var(--text-muted);padding:2rem;text-align:center">Erro ao carregar movimentos.</p>';
  } finally {
    loadingEl.style.display = 'none';
  }
}

// ── Renderizar lista de movimentos ────────────────────────────
function renderFinanceList() {
  const listEl = document.getElementById('finance-list');
  const loadingEl = document.getElementById('finance-loading');
  // Remover itens antigos (mas manter o loading)
  Array.from(listEl.children).forEach(c => {
    if (c !== loadingEl) c.remove();
  });

  if (financeMovements.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<span>💸</span><p>Nenhum movimento registrado ainda.</p>';
    listEl.appendChild(empty);
    return;
  }

  financeMovements.forEach(mov => {
    const card = document.createElement('div');
    card.className = `finance-movement-card ${mov.type}`;
    const dateFormatted = mov.date ? mov.date.split('-').reverse().join('/') : '—';
    const valueFormatted = (mov.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const sign = mov.type === 'income' ? '+' : '-';
    const signClass = mov.type === 'income' ? 'income' : 'expense';
    const sourceTag = mov.source === 'trade' ? '<span class="finance-source-tag">Troca</span>' : '';

    card.innerHTML = `
      <div class="finance-mov-left">
        <div class="finance-mov-icon ${mov.type}">${mov.type === 'income' ? '💰' : '🛒'}</div>
        <div class="finance-mov-info">
          <div class="finance-mov-desc">${mov.description || (mov.type === 'income' ? 'Receita' : 'Despesa')} ${sourceTag}</div>
          <div class="finance-mov-date">${dateFormatted}</div>
        </div>
      </div>
      <div class="finance-mov-right">
        <div class="finance-mov-value ${signClass}">${sign} ${valueFormatted}</div>
        <div class="finance-mov-actions">
          <button class="finance-btn-edit" data-id="${mov.id}" title="Editar">✏️</button>
          <button class="finance-btn-delete" data-id="${mov.id}" title="Excluir">🗑️</button>
        </div>
      </div>
    `;

    // Editar
    card.querySelector('.finance-btn-edit').addEventListener('click', () => {
      openEditFinanceModal(mov);
    });

    // Excluir
    card.querySelector('.finance-btn-delete').addEventListener('click', async () => {
      if (!confirm(`Excluir este movimento?\n${mov.description || ''} — ${(mov.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)) return;
      try {
        await deleteDoc(doc(db, 'financial_movements', mov.id));
        showToast('Movimento excluído.', 'success');
        await loadFinancePanel();
      } catch (e) {
        console.error(e);
        showToast('Erro ao excluir.', 'error');
      }
    });

    listEl.appendChild(card);
  });
}

// ── Abrir modal de edição ─────────────────────────────────────
function openEditFinanceModal(mov) {
  financeEditingId = mov.id;
  financeSelectedType = mov.type;
  document.getElementById('modal-finance-title').textContent = 'Editar Movimento';
  document.getElementById('finance-step-type').classList.add('hidden');
  document.getElementById('finance-step-form').classList.remove('hidden');
  document.getElementById('finance-value').value = mov.value || '';
  document.getElementById('finance-date').value = mov.date || '';
  document.getElementById('finance-description').value = mov.description || '';
  const indicator = document.getElementById('finance-type-indicator');
  if (financeSelectedType === 'income') {
    indicator.innerHTML = '<span class="finance-type-badge income">💰 Entrada (Receita)</span>';
  } else {
    indicator.innerHTML = '<span class="finance-type-badge expense">🛒 Saída (Despesa)</span>';
  }
  document.getElementById('modal-finance').classList.remove('hidden');
}

// ── Atualizar cards de resumo ─────────────────────────────────
function updateFinanceSummary() {
  const totalIncome = financeMovements
    .filter(m => m.type === 'income')
    .reduce((sum, m) => sum + (m.value || 0), 0);
  const totalExpense = financeMovements
    .filter(m => m.type === 'expense')
    .reduce((sum, m) => sum + (m.value || 0), 0);
  const result = totalIncome - totalExpense;
  const ownedCount = myCollection ? myCollection.size : 0;
  const costPerSticker = ownedCount > 0 ? result / ownedCount : 0;

  const fmt = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  document.getElementById('finance-total-income').textContent = fmt(totalIncome);
  document.getElementById('finance-total-expense').textContent = fmt(totalExpense);

  const resultEl = document.getElementById('finance-total-result');
  resultEl.textContent = fmt(result);
  resultEl.className = 'finance-card-value ' + (result >= 0 ? 'positive' : 'negative');

  const costEl = document.getElementById('finance-cost-per-sticker');
  costEl.textContent = fmt(costPerSticker);
  costEl.className = 'finance-card-value ' + (costPerSticker <= 0 ? 'positive' : 'negative');
  document.getElementById('finance-cost-per-sticker-sub').textContent =
    `${ownedCount} figurinha${ownedCount !== 1 ? 's' : ''} na coleção`;
}

// ── Adicionar movimento a partir de troca/venda ───────────────
async function addFinanceMovementFromTrade({ type, value, description, uid: targetUid }) {
  try {
    const uid = targetUid || getActiveUid();
    await addDoc(collection(db, 'financial_movements'), {
      uid,
      type,
      value: parseFloat(value),
      date: new Date().toISOString().split('T')[0],
      description,
      createdAt: Date.now(),
      source: 'trade',
    });
  } catch (e) {
    console.error('Erro ao registrar movimento financeiro da troca:', e);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LINK DE NEGOCIAÇÃO (PÚBLICO)
// ══════════════════════════════════════════════════════════════════════════════

function getMyShareLink() {
  const uid = currentUser?.uid;
  if (!uid) return '';
  const base = window.location.origin;
  return `${base}/troca/${uid}`;
}

async function openShareLinkModal() {
  if (!currentUser) return;
  const modal = document.getElementById('modal-share-link');
  modal.classList.remove('hidden');

  // Preencher URL
  const linkInput = document.getElementById('share-link-url');
  linkInput.value = getMyShareLink();

  // Ler estado do link (linkEnabled) do authorized_users
  try {
    const userDocRef = doc(db, 'authorized_users', currentUser.email.toLowerCase());
    const snap = await getDoc(userDocRef);
    const enabled = snap.exists() ? snap.data().linkEnabled !== false : true;
    document.getElementById('share-link-toggle').checked = enabled;
  } catch (e) {
    document.getElementById('share-link-toggle').checked = true;
  }

  // Carregar propostas externas recebidas
  await loadExternalProposals();
}

function closeShareLinkModal() {
  document.getElementById('modal-share-link').classList.add('hidden');
}

async function toggleShareLink(enabled) {
  if (!currentUser) return;
  try {
    const userDocRef = doc(db, 'authorized_users', currentUser.email.toLowerCase());
    await updateDoc(userDocRef, { linkEnabled: enabled });
    showToast(enabled ? '🔗 Link ativado!' : '🔒 Link desativado.', enabled ? 'success' : '');
  } catch (e) {
    showToast('Erro ao atualizar link.', 'error');
  }
}

function copyShareLink() {
  const url = getMyShareLink();
  navigator.clipboard.writeText(url).then(() => {
    showToast('🔗 Link copiado!', 'success');
  }).catch(() => {
    const input = document.getElementById('share-link-url');
    input.select();
    document.execCommand('copy');
    showToast('🔗 Link copiado!', 'success');
  });
}

async function loadExternalProposals() {
  const list = document.getElementById('share-link-proposals-list');
  list.innerHTML = '<div style="color:#aaa;font-size:12px;padding:8px">Carregando…</div>';
  try {
    const uid = currentUser?.uid;
    if (!uid) { list.innerHTML = ''; return; }
    // Buscar sem orderBy para evitar índice composto; filtrar e ordenar no cliente
    const rawSnap = await getDocs(
      query(collection(db, 'external_proposals'), where('toUid', '==', uid))
    );
    const allItems = [];
    rawSnap.forEach(d => allItems.push({ id: d.id, ...d.data() }));
    allItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    // Simular snap.empty e snap.forEach
    const snap = {
      empty: allItems.length === 0,
      forEach: (fn) => allItems.forEach(item => fn({ data: () => item }))
    };
    if (snap.empty) {
      list.innerHTML = '<div style="color:#aaa;font-size:12px;padding:8px">Nenhuma proposta externa recebida ainda.</div>';
      return;
    }
    list.innerHTML = '';
    snap.forEach(d => {
      const p = d.data();
      const dt = p.createdAt ? new Date(p.createdAt).toLocaleString('pt-BR') : '';
      const typeLabel = p.type === 'venda' ? `💰 ${p.saleRole === 'vendedor' ? 'Venda' : 'Compra'} R$ ${(p.saleValue||0).toFixed(2)}` : '🔄 Troca';
      const statusColors = { pending: '#c0a020', accepted: '#4a9', refused: '#e55', cancelled: '#888' };
      const statusLabels = { pending: 'Pendente', accepted: 'Aceita', refused: 'Recusada', cancelled: 'Cancelada' };
      const div = document.createElement('div');
      div.style.cssText = 'background:#1a1a2e;border-radius:8px;padding:10px 12px;margin-bottom:8px;font-size:12px';
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <strong style="color:#f0f0f0">${p.senderName}</strong>
          <span style="color:${statusColors[p.status]||'#aaa'};font-size:11px">${statusLabels[p.status]||p.status}</span>
        </div>
        <div style="color:#aaa;margin-bottom:4px">${typeLabel} · ${dt}</div>
        ${p.senderContact ? `<div style="color:#88c">📞 ${p.senderContact}</div>` : ''}
        ${p.message ? `<div style="color:#ccc;margin-top:4px;font-style:italic">"${p.message}"</div>` : ''}
        ${p.offeredCodes?.length ? `<div style="margin-top:4px;color:#9de">Oferece: ${p.offeredCodes.join(', ')}</div>` : ''}
        ${p.requestedCodes?.length ? `<div style="color:#fda">Quer: ${p.requestedCodes.join(', ')}</div>` : ''}
      `;
      list.appendChild(div);
    });
  } catch (e) {
    list.innerHTML = '<div style="color:#e55;font-size:12px;padding:8px">Erro ao carregar propostas.</div>';
  }
}

// Esconder o botão de link para admin sem impersonação
function updateShareLinkVisibility() {
  const btn = document.getElementById('btn-share-link');
  if (!btn) return;
  const isAdminNoImpersonation = currentUser && ADMIN_EMAILS.includes(currentUser.email) && !impersonatedUser;
  btn.classList.toggle('hidden', isAdminNoImpersonation);
}

// ── Event listeners para o modal de link de negociação ──
// Em ES Modules o script já executa após o DOM estar pronto, sem precisar de DOMContentLoaded
document.getElementById('btn-share-link')?.addEventListener('click', () => openShareLinkModal());
document.getElementById('btn-copy-share-link')?.addEventListener('click', () => copyShareLink());
document.getElementById('btn-close-share-link')?.addEventListener('click', () => closeShareLinkModal());
document.getElementById('share-link-toggle')?.addEventListener('change', (e) => toggleShareLink(e.target.checked));
