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

// ── Estado global ─────────────────────────────────────────────
let currentUser = null;
let allStickers = [];
let myCollection = new Set();   // Set de códigos que o usuário possui
let myDuplicates = {};          // { code: quantity }
let activeTab = 'colecao';
let activeGroup = 'all';
let activeStatus = null;        // 'missing' | 'owned' | null
let activeTradeGroup = 'all';   // filtro de grupo na aba trocas
let searchQuery = '';

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

  // Verificar se está autorizado
  const authorized = await checkAuthorized(user.email);
  if (!authorized) {
    deniedEmail.textContent = user.email;
    showScreen('denied');
    return;
  }

  currentUser = user;
  showScreen('app');

  // Mostrar aba Admin se for administrador
  if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    document.getElementById('tab-btn-admin').classList.remove('hidden');
  }

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
  if (name === 'login') loginScreen.classList.remove('hidden');
  else if (name === 'denied') deniedScreen.classList.remove('hidden');
  else if (name === 'app') appScreen.classList.remove('hidden');
}

// ══════════════════════════════════════════════
// INICIALIZAÇÃO DO APP
// ══════════════════════════════════════════════
async function initApp() {
  // Exibir dados do usuário no header
  const initials = (currentUser.displayName || currentUser.email)
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const initialsEl = document.getElementById('user-avatar-initials');
  if (currentUser.photoURL) {
    const img = document.createElement('img');
    img.src = currentUser.photoURL;
    img.alt = initials;
    img.onerror = () => { img.remove(); if (initialsEl) initialsEl.textContent = initials; };
    userAvatar.innerHTML = '';
    userAvatar.appendChild(img);
  } else {
    if (initialsEl) initialsEl.textContent = initials;
  }
  userName.textContent = (currentUser.displayName || currentUser.email).split(' ')[0];

  // Registrar UID no documento do usuário autorizado (para mapeamento UID→nome nas trocas)
  try {
    const userDocRef = doc(db, 'authorized_users', currentUser.email.toLowerCase());
    await updateDoc(userDocRef, { uid: currentUser.uid }).catch(() => {});
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
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  progressFill.style.width = pct + '%';
  progressText.textContent = `${owned} / ${total}`;
  progressPct.textContent = `${pct}%`;

  // Contar total de repetidas
  const totalDups = Object.values(myDuplicates).reduce((sum, q) => sum + (q > 0 ? q : 0), 0);
  dupTotal.textContent = totalDups;
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

    // Mostrar/ocultar filtros de status (só na coleção)
    document.querySelector('.filter-status').style.display =
      activeTab === 'colecao' ? 'flex' : 'none';

    // Ocultar barra de filtro inteira apenas na aba Admin
    const filterBar = document.querySelector('.filter-bar');
    if (filterBar) {
      filterBar.style.display = activeTab === 'admin' ? 'none' : '';
    }

    if (activeTab === 'trocas') loadTradingPanel();
    if (activeTab === 'admin') loadAdminPanel();
  });
});

// Os chips de grupo do topo (data-group) já controlam activeGroup e chamam renderMatchesList via renderGrid/renderDuplicatesGrid
// Quando a aba Trocas está ativa, o filtro de grupo usa activeGroup diretamente

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
          await setDoc(doc(db, 'duplicates', currentUser.uid), {
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
          await setDoc(doc(db, 'collections', currentUser.uid), {
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

  // Usar DocumentFragment para performance
  const frag = document.createDocumentFragment();
  filtered.forEach(s => {
    frag.appendChild(createStickerCard(s));
  });
  stickerGrid.appendChild(frag);
}

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
    <div class="sticker-meta">
      ${s.group && s.group !== '-' ? `<span class="sticker-group">Grupo ${s.group}</span>` : s.group === '-' ? '<span class="sticker-group">FIFA</span>' : ''}
      <span class="sticker-page">Pág. ${s.page}</span>
    </div>
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

  // Persistir no Firestore
  try {
    const uid = currentUser.uid;
    await setDoc(doc(db, 'collections', uid), {
      codes: Array.from(myCollection),
      email: currentUser.email.toLowerCase(),
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
  const filtered = getFilteredStickers();
  stickerGridDup.innerHTML = '';

  if (filtered.length === 0) {
    emptyStateDup.classList.remove('hidden');
    return;
  }
  emptyStateDup.classList.add('hidden');

  const frag = document.createDocumentFragment();
  filtered.forEach(s => {
    frag.appendChild(createDupCard(s));
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
    <div class="sticker-meta">
      ${s.group && s.group !== '-' ? `<span class="sticker-group">Grupo ${s.group}</span>` : s.group === '-' ? '<span class="sticker-group">FIFA</span>' : ''}
      <span class="sticker-page">Pág. ${s.page}</span>
    </div>
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

  // Persistir
  try {
    const uid = currentUser.uid;
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

    const uid = currentUser.uid;

    // Mapear coleções dos outros usuários
    const othersCollection = {}; // { uid: Set<code> }
    colSnaps.forEach(snap => {
      if (snap.id !== uid) {
        othersCollection[snap.id] = new Set(snap.data().codes || []);
      }
    });

    // Mapear repetidas dos outros usuários
    const othersDuplicates = {}; // { uid: { code: qty } }
    dupSnaps.forEach(snap => {
      if (snap.id !== uid) {
        othersDuplicates[snap.id] = snap.data().items || {};
      }
    });

    // Buscar nomes dos usuários (mapeamento UID → nome via campo uid em authorized_users)
    const userSnaps = await getDocs(collection(db, 'authorized_users'));
    const userNames = {}; // { uid: nome }
    const userList = []; // lista de membros para o modal de proposta
    userSnaps.forEach(snap => {
      const data = snap.data();
      const nome = data.name || snap.id;
      if (data.uid) {
        userNames[data.uid] = nome;
        if (data.uid !== uid) {
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
    renderGroupStats(colSnaps, dupSnaps);

    tradingLoading.style.display = 'none';
    tradingContent.classList.remove('hidden');

  } catch (e) {
    console.error(e);
    tradingLoading.style.display = 'none';
    showToast('Erro ao carregar painel de trocas.', 'error');
  }
}


// ════════════════════════════════════════════
// ESTATÍSTICAS DO GRUPO
// ════════════════════════════════════════════
function renderGroupStats(colSnaps, dupSnaps) {
  const statsGrid = document.getElementById('stats-grid');
  if (!statsGrid) return;

  const ownerCount = {};
  colSnaps.forEach(snap => {
    (snap.data().codes || []).forEach(code => {
      ownerCount[code] = (ownerCount[code] || 0) + 1;
    });
  });

  const dupCount = {};
  dupSnaps.forEach(snap => {
    Object.entries(snap.data().items || {}).forEach(([code, qty]) => {
      if (qty > 0) dupCount[code] = (dupCount[code] || 0) + qty;
    });
  });

  const totalParticipants = colSnaps.size;

  const topDups = Object.entries(dupCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, qty]) => ({ code, qty, sticker: allStickers.find(s => s.code === code) }))
    .filter(x => x.sticker);

  const topNeeded = allStickers
    .map(s => ({ code: s.code, name: s.name, count: ownerCount[s.code] || 0, sticker: s }))
    .filter(x => x.count > 0)
    .sort((a, b) => a.count - b.count)
    .slice(0, 5);

  statsGrid.innerHTML = `
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
        Mais necessárias no grupo
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
            <span class="stats-value blue">${x.count}/${totalParticipants}</span>
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

  const listEl = document.getElementById('admin-users-list');
  const loadingEl = document.getElementById('admin-loading');
  loadingEl.style.display = 'flex';

  try {
    const snap = await getDocs(collection(db, 'authorized_users'));
    const users = [];
    snap.forEach(d => users.push({ id: d.id, ...d.data() }));
    users.sort((a, b) => a.id.localeCompare(b.id));
    renderAdminUsers(users);
  } catch (e) {
    showToast('Erro ao carregar usuários.', 'error');
  } finally {
    loadingEl.style.display = 'none';
  }

  // Configurar botão de adicionar — usar flag para evitar múltiplos listeners
  const btnAdd = document.getElementById('btn-add-user');
  if (!btnAdd._listenerAttached) {
    btnAdd.addEventListener('click', addUser);
    btnAdd._listenerAttached = true;
  }
  document.getElementById('admin-email-input').onkeydown = (e) => { if (e.key === 'Enter') addUser(); };
  document.getElementById('admin-name-input').onkeydown = (e) => { if (e.key === 'Enter') addUser(); };
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
  buildMemberList();
  showProposalStep('member');
});

// Tipo: avulsa
document.getElementById('proposal-type-external').addEventListener('click', () => {
  proposalState.type = 'external';
  document.getElementById('proposal-external-name').value = '';
  document.getElementById('proposal-external-next').disabled = true;
  showProposalStep('external');
});

// Voltar do membro
document.getElementById('proposal-back-member').addEventListener('click', () => showProposalStep('type'));

// Voltar do externo
document.getElementById('proposal-back-external').addEventListener('click', () => showProposalStep('type'));

// Habilitar botão próximo no externo
document.getElementById('proposal-external-name').addEventListener('input', function() {
  document.getElementById('proposal-external-next').disabled = this.value.trim().length < 2;
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
    const uid = currentUser.uid;
    const myName = currentUser.displayName || currentUser.email;
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

// ── Renderizar propostas enviadas e recebidas ──────────────
function renderProposals() {
  renderSentProposals();
  renderReceivedProposals();
}

function renderSentProposals() {
  const list = document.getElementById('sent-proposals-list');
  if (!list) return;
  list.innerHTML = '';

  const proposals = (window._mySentProposals || [])
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const countEl = document.getElementById('sent-proposals-count');
  if (countEl) countEl.textContent = proposals.length;

  const sectionEl = document.getElementById('section-sent-proposals');
  if (sectionEl) sectionEl.style.display = proposals.length === 0 ? 'none' : '';

  proposals.forEach(p => {
    const card = createProposalCard(p, 'sent');
    list.appendChild(card);
  });
}

function renderReceivedProposals() {
  const list = document.getElementById('received-proposals-list');
  if (!list) return;
  list.innerHTML = '';

  const proposals = (window._myReceivedProposals || [])
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const pending = proposals.filter(p => p.status === 'pending');
  const countEl = document.getElementById('received-proposals-count');
  if (countEl) countEl.textContent = pending.length || '';

  const sectionEl = document.getElementById('section-received-proposals');
  if (sectionEl) sectionEl.style.display = proposals.length === 0 ? 'none' : '';

  proposals.forEach(p => {
    const card = createProposalCard(p, 'received');
    list.appendChild(card);
  });
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
  const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('pt-BR') : '';
  const partner = side === 'sent' ? p.toName : p.fromName;
  const typeTag = p.type === 'external' ? '<span class="proposal-external-tag">Externo</span>' : '';

  const offerSummary = (p.offeredCodes || []).slice(0, 4).join(', ') +
    ((p.offeredCodes || []).length > 4 ? ` +${p.offeredCodes.length - 4}` : '');
  const wantSummary = (p.requestedCodes || []).slice(0, 4).join(', ') +
    ((p.requestedCodes || []).length > 4 ? ` +${p.requestedCodes.length - 4}` : '');

  card.innerHTML = `
    <div class="proposal-card-header">
      <div class="proposal-card-partner">
        <span class="proposal-member-avatar" style="width:24px;height:24px;font-size:0.75rem">${(partner || '?').charAt(0).toUpperCase()}</span>
        <span>${partner || 'Desconhecido'}</span>
        ${typeTag}
      </div>
      <div class="proposal-card-meta">
        <span class="proposal-status ${st.cls}">${st.label}</span>
        <span class="proposal-card-date">${dateStr}</span>
      </div>
    </div>
    <div class="proposal-card-body">
      ${offerSummary ? `<div class="proposal-card-row"><span class="proposal-card-label offer">Oferece</span><span class="proposal-card-codes">${offerSummary}</span></div>` : ''}
      ${wantSummary ? `<div class="proposal-card-row"><span class="proposal-card-label want">Quer</span><span class="proposal-card-codes">${wantSummary}</span></div>` : ''}
    </div>
    <div class="proposal-card-actions" id="actions-${p.id}"></div>
  `;

  const actionsEl = card.querySelector(`#actions-${p.id}`);

  if (side === 'sent' && p.status === 'pending') {
    // Cancelar proposta enviada
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-proposal-cancel';
    cancelBtn.textContent = 'Cancelar proposta';
    cancelBtn.addEventListener('click', () => cancelProposal(p.id));
    actionsEl.appendChild(cancelBtn);
  }

  if (side === 'sent' && p.type === 'external' && p.status === 'pending') {
    // Confirmar troca avulsa
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn-proposal-accept';
    confirmBtn.textContent = '✓ Confirmar troca realizada';
    confirmBtn.addEventListener('click', () => confirmExternalTrade(p));
    actionsEl.appendChild(confirmBtn);
  }

  if (side === 'received' && p.status === 'pending') {
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'btn-proposal-accept';
    acceptBtn.textContent = '✓ Aceitar';
    acceptBtn.addEventListener('click', () => acceptProposal(p));

    const refuseBtn = document.createElement('button');
    refuseBtn.className = 'btn-proposal-cancel';
    refuseBtn.textContent = '✗ Recusar';
    refuseBtn.addEventListener('click', () => refuseProposal(p.id));

    actionsEl.appendChild(acceptBtn);
    actionsEl.appendChild(refuseBtn);
  }

  return card;
}

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
    const uid = currentUser.uid;

    await runTransaction(db, async (tx) => {
      // Ler documentos de coleção e repetidas dos dois usuários
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

      // Verificar conflito: alguma figurinha que eu quero receber já foi recebida?
      for (const code of (proposal.requestedCodes || [])) {
        if (myCodes.has(code)) {
          throw new Error(`Conflito: você já tem a figurinha ${code}.`);
        }
      }

      // Aplicar: eu recebo o que pedi (requestedCodes = repetidas de quem enviou)
      // requestedCodes: o que EU (receptor) quero = o que o fromUid ofereceu como repetidas
      // offeredCodes: o que o fromUid me oferece → entram na minha coleção e saem das repetidas dele
      // requestedCodes: o que eu ofereço ao fromUid → entram na coleção dele e saem das minhas repetidas

      // Eu recebo: offeredCodes do fromUid → entram na minha coleção
      for (const code of (proposal.offeredCodes || [])) {
        myCodes.add(code);
        // Sair das repetidas do fromUid
        if (theirDups[code] > 0) {
          theirDups[code] = Math.max(0, (theirDups[code] || 1) - 1);
          if (theirDups[code] === 0) delete theirDups[code];
        }
      }

      // fromUid recebe: requestedCodes → entram na coleção dele
      for (const code of (proposal.requestedCodes || [])) {
        theirCodes.add(code);
        // Sair das minhas repetidas
        if (myDups[code] > 0) {
          myDups[code] = Math.max(0, (myDups[code] || 1) - 1);
          if (myDups[code] === 0) delete myDups[code];
        }
      }

      // Salvar tudo
      tx.set(myColRef, { codes: [...myCodes] }, { merge: true });
      tx.set(myDupRef, { items: myDups }, { merge: true });
      tx.set(theirColRef, { codes: [...theirCodes] }, { merge: true });
      tx.set(theirDupRef, { items: theirDups }, { merge: true });
      tx.update(proposalRef, { status: 'accepted', confirmedAt: Date.now(), updatedAt: Date.now() });

      // Cancelar automaticamente outras propostas conflitantes
      // (propostas onde eu pedia as mesmas figurinhas que acabei de receber)
    });

    // Cancelar propostas conflitantes (fora da transação para simplicidade)
    await cancelConflictingProposals(proposal.offeredCodes || []);

    showToast('Troca aceita! Coleções atualizadas. 🎉', 'success');

    // Atualizar estado local
    for (const code of (proposal.offeredCodes || [])) {
      myCollection.add(code);
    }
    for (const code of (proposal.requestedCodes || [])) {
      if (myDuplicates[code] > 0) {
        myDuplicates[code]--;
        if (myDuplicates[code] === 0) delete myDuplicates[code];
      }
    }
    updateProgressBar();
    await loadTradingPanel();

  } catch (e) {
    console.error(e);
    if (btn) { btn.disabled = false; btn.textContent = '✓ Aceitar'; }
    showToast(e.message || 'Erro ao aceitar proposta.', 'error');
  }
}

async function confirmExternalTrade(proposal) {
  const btn = event?.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Processando...'; }

  try {
    const uid = currentUser.uid;
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
  const uid = currentUser.uid;
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

document.getElementById('btn-export-pdf').addEventListener('click', exportAlbumPDF);

async function exportAlbumPDF() {
  if (!allStickers || allStickers.length === 0) {
    showToast('Aguarde o carregamento das figurinhas.', 'error');
    return;
  }

  // Mostrar mensagem de progresso
  showToast('Gerando PDF, aguarde… (carregando bandeiras)', 'info');

  try {
    const { jsPDF } = window.jspdf;

    const userName = currentUser.displayName || currentUser.email.split('@')[0];
    const today = new Date().toLocaleDateString('pt-BR');
    const totalOwned = myCollection ? myCollection.size : 0;
    const totalStickers = allStickers.length;
    const pct = Math.round((totalOwned / totalStickers) * 100);

    // Carregar foto do usuário
    let userPhotoDataUrl = null;
    if (currentUser.photoURL) {
      try { userPhotoDataUrl = await loadImageAsDataUrl(currentUser.photoURL); } catch (_) {}
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

    // Mesclar SUI e SWI (mesmo time, códigos diferentes)
    if (teamMap['SUI'] && teamMap['SWI']) {
      teamMap['SUI'].stickers = [...teamMap['SUI'].stickers, ...teamMap['SWI'].stickers]
        .sort((a, b) => {
          const na = parseInt(a.code.replace(/^[A-Z]+/, ''));
          const nb = parseInt(b.code.replace(/^[A-Z]+/, ''));
          return na - nb;
        });
      delete teamMap['SWI'];
    }

    const teams = Object.values(teamMap);
    const regular = teams.filter(t => t.group !== '-' && t.group !== 'CC')
      .sort((a, b) => (TEAM_NAMES_PT[a.code] || a.code).localeCompare(TEAM_NAMES_PT[b.code] || b.code, 'pt'));
    const fwc = teams.filter(t => t.group === '-');
    const cc = teams.filter(t => t.group === 'CC');
    const orderedTeams = [...regular, ...fwc, ...cc];

    // Pré-carregar bandeiras
    showToast('Gerando PDF, aguarde… (carregando bandeiras)', 'info');
    const flagCache = {};
    const flagPromises = orderedTeams.map(async team => {
      const iso = TEAM_FLAG_ISO[team.code];
      if (!iso) return;
      try {
        const url = `https://flagcdn.com/w20/${iso}.png`;
        flagCache[team.code] = await loadImageAsDataUrl(url);
      } catch (_) {}
    });
    await Promise.all(flagPromises);

    showToast('Gerando PDF, aguarde… (montando páginas)', 'info');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // ── PÁGINA 1: Controle do Álbum ──
    await drawPDFPageV2(doc, {
      teams: orderedTeams, collection: myCollection, duplicates: null,
      pageTitle: 'Controle do Álbum', userName, today, totalOwned, totalStickers, pct,
      userPhotoDataUrl, flagCache, mode: 'collection', isFirstPage: true
    });

    // ── PÁGINA 2: Controle de Repetidas ──
    doc.addPage();
    await drawPDFPageV2(doc, {
      teams: orderedTeams, collection: myCollection, duplicates: myDuplicates || {},
      pageTitle: 'Repetidas para Troca', userName, today, totalOwned, totalStickers, pct,
      userPhotoDataUrl, flagCache, mode: 'duplicates', isFirstPage: false
    });

    doc.save(`album-copa-2026-${userName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    showToast('PDF gerado com sucesso!', 'success');
  } catch (e) {
    console.error('Erro ao gerar PDF:', e);
    showToast('Erro ao gerar PDF. Tente novamente.', 'error');
  }
}

async function drawPDFPageV2(doc, { teams, collection, duplicates, pageTitle, userName, today, totalOwned, totalStickers, pct, userPhotoDataUrl, flagCache, mode }) {
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
  doc.text(`${userName}  ·  Gerado em ${today}  ·  ${totalOwned}/${totalStickers} figurinhas (${pct}%)`, pageW / 2, 19, { align: 'center' });

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
  doc.setFillColor(0, 0, 0);
  doc.rect(legX, legY, 7, 3, 'F');
  doc.setFontSize(6);
  doc.setTextColor(60, 60, 60);
  doc.text('Tenho', legX + 8, legY + 2.3);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.rect(legX + 20, legY, 7, 3, 'FD');
  doc.setFontSize(6);
  doc.setTextColor(60, 60, 60);
  doc.text('Falta', legX + 28, legY + 2.3);

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

    // Código (1ª metade)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 100, 100);
    doc.text(team.code, margin + flagW + labelW + 0.5, y + rowH - 1.2);

    // Células 1-10
    for (let n = 1; n <= halfNums; n++) {
      const cx = margin + flagW + labelW + codeW + (n - 1) * cellW;
      const sticker = team.stickers.find(s => {
        const num = parseInt(s.code.replace(/^[A-Z]+/, ''));
        return num === n;
      });
      if (sticker) {
        drawStickerCellV2(doc, cx, y, cellW, rowH, sticker.code, collection, duplicates, mode, n, rowIndex);
      } else {
        // Posição não existe — célula vazia escura
        doc.setFillColor(200, 200, 200);
        doc.rect(cx + 0.3, y + 0.3, cellW - 0.6, rowH - 0.6, 'F');
      }
    }

    // Código (2ª metade)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 100, 100);
    doc.text(team.code, margin + flagW + labelW + codeW + halfNums * cellW + 0.5, y + rowH - 1.2);

    // Células 11-20
    for (let n = halfNums + 1; n <= maxNums; n++) {
      const cx = margin + flagW + labelW + codeW * 2 + (n - 1) * cellW;
      const sticker = team.stickers.find(s => {
        const num = parseInt(s.code.replace(/^[A-Z]+/, ''));
        return num === n;
      });
      if (sticker) {
        drawStickerCellV2(doc, cx, y, cellW, rowH, sticker.code, collection, duplicates, mode, n, rowIndex);
      } else {
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

function drawStickerCellV2(doc, x, y, w, h, code, collection, duplicates, mode, num, rowIndex) {
  const pad = 0.3;
  const cx = x + w / 2;
  const cy = y + h / 2 + 1.2;
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
      doc.text(String(num), cx, cy, { align: 'center' });
    }
  } else {
    // Modo repetidas
    const qty = duplicates ? (duplicates[code] || 0) : 0;
    if (qty > 0) {
      // Fundo cinza escuro com número da quantidade
      doc.setFillColor(60, 60, 60);
      doc.rect(x + pad, y + pad, w - pad * 2, h - pad * 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(qty > 9 ? 3.5 : 4.5);
      doc.setTextColor(255, 255, 255);
      doc.text(String(qty), cx, cy, { align: 'center' });
    } else {
      // Vazio com número da posição
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(170, 170, 170);
      doc.setLineWidth(0.2);
      doc.rect(x + pad, y + pad, w - pad * 2, h - pad * 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4);
      doc.setTextColor(numColor, numColor, numColor);
      doc.text(String(num), cx, cy, { align: 'center' });
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
