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
  query,
  where,
  writeBatch
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
  userAvatar.textContent = initials;
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
});

btnClearSearch.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  btnClearSearch.classList.add('hidden');
  renderGrid();
  renderDuplicatesGrid();
});

document.querySelectorAll('.filter-chip[data-group]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip[data-group]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeGroup = btn.dataset.group;
    renderGrid();
    renderDuplicatesGrid();
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

    if (activeTab === 'trocas') loadTradingPanel();
    if (activeTab === 'admin') loadAdminPanel();
  });
});

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
const shareStepGroup   = document.getElementById('share-step-group');
const shareStepCountry = document.getElementById('share-step-country');
const shareStepPreview = document.getElementById('share-step-preview');
const sharePreviewText = document.getElementById('share-preview-text');
let   shareContext     = null; // guarda o tipo e filtro selecionado

// Abrir modal
document.getElementById('btn-share').addEventListener('click', () => openShareModal());

// Fechar modal
document.getElementById('btn-close-share').addEventListener('click', () => closeShareModal());
modalShare.addEventListener('click', (e) => { if (e.target === modalShare) closeShareModal(); });

function openShareModal() {
  showShareStep('step1');
  modalShare.classList.remove('hidden');

  // Popular lista de grupos
  const groupList = document.getElementById('share-group-list');
  groupList.innerHTML = '';
  const groups = ['-', ...'ABCDEFGHIJKL'.split('')];
  groups.forEach(g => {
    const label = g === '-' ? 'FIFA' : `Grupo ${g}`;
    const btn = document.createElement('button');
    btn.className = 'share-sub-btn';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      shareContext = { type: 'group', value: g, label };
      buildSharePreview();
      showShareStep('preview');
    });
    groupList.appendChild(btn);
  });

  // Popular lista de seleções
  const countryList = document.getElementById('share-country-list');
  countryList.innerHTML = '';
  const countries = [...new Set(allStickers.map(s => s.country))].sort();
  countries.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'share-sub-btn';
    btn.textContent = c;
    btn.addEventListener('click', () => {
      shareContext = { type: 'country', value: c, label: c };
      buildSharePreview();
      showShareStep('preview');
    });
    countryList.appendChild(btn);
  });
}

function closeShareModal() {
  modalShare.classList.add('hidden');
  shareContext = null;
}

function showShareStep(step) {
  shareStep1.classList.add('hidden');
  shareStepGroup.classList.add('hidden');
  shareStepCountry.classList.add('hidden');
  shareStepPreview.classList.add('hidden');
  if (step === 'step1')   shareStep1.classList.remove('hidden');
  if (step === 'group')   shareStepGroup.classList.remove('hidden');
  if (step === 'country') shareStepCountry.classList.remove('hidden');
  if (step === 'preview') shareStepPreview.classList.remove('hidden');
}

// Navegação entre passos
document.getElementById('share-back-group').addEventListener('click', () => showShareStep('step1'));
document.getElementById('share-back-country').addEventListener('click', () => showShareStep('step1'));
document.getElementById('share-back-preview').addEventListener('click', () => {
  if (shareContext?.type === 'group') showShareStep('group');
  else if (shareContext?.type === 'country') showShareStep('country');
  else showShareStep('step1');
});

// Opções do passo 1
document.querySelectorAll('.share-option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.share;
    if (type === 'group') {
      showShareStep('group');
    } else if (type === 'country') {
      showShareStep('country');
    } else {
      shareContext = { type };
      buildSharePreview();
      showShareStep('preview');
    }
  });
});

// Helpers de agrupamento
const GROUP_ORDER = ['FIFA', ...'ABCDEFGHIJKL'.split('').map(g => `Grupo ${g}`)];

function groupStickers(stickers) {
  const grouped = {};
  stickers.forEach(s => {
    const grp = s.group === '-' ? 'FIFA' : `Grupo ${s.group}`;
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

function buildSharePreview() {
  const name = (currentUser.displayName || currentUser.email).split(' ')[0];
  const { type, label } = shareContext || {};
  let stickers = [];
  let title = '';
  let footer = '';

  if (type === 'missing') {
    stickers = allStickers.filter(s => !myCollection.has(s.code));
    title = `⬜ *Figurinhas Faltando — ${name}*`;
    footer = `_Total: ${stickers.length} faltando de ${allStickers.length}_`;

  } else if (type === 'duplicates') {
    stickers = allStickers.filter(s => (myDuplicates[s.code] || 0) > 0);
    title = `🔄 *Figurinhas Repetidas — ${name}*`;
    const totalDups = Object.values(myDuplicates).reduce((s, q) => s + (q > 0 ? q : 0), 0);
    footer = `_Total: ${totalDups} repetidas_`;

  } else if (type === 'owned') {
    stickers = allStickers.filter(s => myCollection.has(s.code));
    title = `✅ *Minha Coleção — ${name}*`;
    footer = `_Total: ${stickers.length} de ${allStickers.length} figurinhas_`;

  } else if (type === 'group') {
    stickers = allStickers.filter(s => s.group === shareContext.value);
    title = `🗂️ *${label} — ${name}*`;
    const owned = stickers.filter(s => myCollection.has(s.code)).length;
    footer = `_${owned} de ${stickers.length} figurinhas deste grupo_`;

  } else if (type === 'country') {
    stickers = allStickers.filter(s => s.country === shareContext.value);
    title = `🌎 *${label} — ${name}*`;
    const owned = stickers.filter(s => myCollection.has(s.code)).length;
    footer = `_${owned} de ${stickers.length} figurinhas desta seleção_`;
  }

  if (stickers.length === 0) {
    sharePreviewText.value = 'Nenhuma figurinha encontrada para este filtro.';
    return;
  }

  const { grouped, sortedKeys } = groupStickers(stickers);
  let msg = `🏆 ${title}\n_Copa 2026 Panini_\n\n`;

  sortedKeys.forEach(grp => {
    msg += `*${grp}*\n`;
    grouped[grp].forEach(s => {
      const qty = myDuplicates[s.code];
      const owned = myCollection.has(s.code);
      let line = `  ${s.code}`;
      if (type === 'duplicates' && qty > 1) line += ` (${qty}x)`;
      if (type === 'group' || type === 'country') line += owned ? ' ✅' : ' ⬜';
      msg += line + '\n';
    });
    msg += '\n';
  });

  msg += footer;
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
    // Buscar coleções e repetidas de todos os usuários
    const [colSnaps, dupSnaps] = await Promise.all([
      getDocs(collection(db, 'collections')),
      getDocs(collection(db, 'duplicates'))
    ]);

    const uid = currentUser.uid;

    // Mapear coleções dos outros usuários
    const othersCollection = {}; // { uid: Set<code> }
    colSnaps.forEach(snap => {
      if (snap.id !== uid) {
        othersCollection[snap.id] = new Set(snap.data().codes || []);
      }
    });

    // Buscar nomes dos usuários (mapeamento UID → nome via campo uid em authorized_users)
    const userSnaps = await getDocs(collection(db, 'authorized_users'));
    const userNames = {}; // { uid: nome }
    userSnaps.forEach(snap => {
      const data = snap.data();
      const nome = data.name || snap.id; // nome cadastrado pelo admin ou email
      // Mapear pelo campo uid salvo no login
      if (data.uid) {
        userNames[data.uid] = nome;
      }
      // Mapear pelo email como chave extra (fallback)
      const email = snap.data().email || snap.id;
      userNames[email] = nome;
    });
    // Fallback: se algum UID ainda não tem nome, usar o próprio UID abreviado
    colSnaps.forEach(snap => {
      if (!userNames[snap.id]) {
        // Tentar pelo email salvo na coleção
        const colEmail = snap.data().email;
        if (colEmail && userNames[colEmail]) {
          userNames[snap.id] = userNames[colEmail];
        }
      }
    });

    // Minhas repetidas que outros precisam
    const matchesList = document.getElementById('matches-list');
    matchesList.innerHTML = '';
    let matchCount = 0;

    Object.entries(myDuplicates).forEach(([code, qty]) => {
      if (qty <= 0) return;
      // Quem não tem essa figurinha na coleção?
      const needers = Object.entries(othersCollection)
        .filter(([oUid, oSet]) => !oSet.has(code))
        .map(([oUid]) => oUid);

      if (needers.length > 0) {
        matchCount++;
        const sticker = allStickers.find(s => s.code === code);
        if (!sticker) return;
        const card = document.createElement('div');
        card.className = 'trade-card is-match';
        card.innerHTML = `
          <div class="trade-code">${sticker.code}</div>
          <div class="trade-name">${sticker.name}</div>
          <div class="trade-meta">
            ${sticker.group && sticker.group !== '-' ? `<span class="trade-group">Grupo ${sticker.group}</span>` : sticker.group === '-' ? '<span class="trade-group">FIFA</span>' : ''}
            <span class="trade-page">Pág. ${sticker.page}</span>
          </div>
          <div class="trade-users">
            <div class="trade-user">
              <span class="trade-user-dot" style="background:var(--gold)"></span>
              <span>Você tem</span>
              <span class="trade-user-qty" style="color:var(--gold);background:var(--gold-dim)">${qty}x</span>
            </div>
            ${needers.map(nUid => `
              <div class="trade-user">
                <span class="trade-user-dot blue"></span>
                <span>${userNames[nUid] || nUid} precisa</span>
              </div>
            `).join('')}
          </div>
        `;
        matchesList.appendChild(card);
      }
    });

    document.getElementById('matches-count').textContent = matchCount;

    // Renderizar estatísticas do grupo
    renderGroupStats(colSnaps, dupSnaps);

    tradingLoading.style.display = 'none';
    tradingContent.classList.remove('hidden');

  } catch (e) {
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
