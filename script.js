// ============================================================
// CONFIGURATION FIREBASE
// Remplacez les valeurs ci-dessous par celles de votre projet
// Firebase : https://console.firebase.google.com
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDv1vUolUzIpvZMxOyGa0lVLpYDV0yTb74",
    authDomain: "nounoupro-ac374.firebaseapp.com",
    projectId: "nounoupro-ac374",
    storageBucket: "nounoupro-ac374.firebasestorage.app",
    messagingSenderId: "245286343426",
    appId: "1:245286343426:web:ef7f5a0256f260cfcd281b"
};

const FIREBASE_CONFIGURED = FIREBASE_CONFIG.apiKey !== "VOTRE_API_KEY";

let app, auth, db;

if (FIREBASE_CONFIGURED) {
    app = initializeApp(FIREBASE_CONFIG);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    document.getElementById('config-banner').classList.add('show');
}

// ============================================================
// TARIFS
// ============================================================
let RATES = {
    HOURLY: 4.50,
    OVERTIME_HOURLY: 5.62,
    MEAL: 3.00,
    MAINTENANCE_MINIMUM: 2.95,
    MAINTENANCE_COEFF: 0.425,
    MAINTENANCE_THRESHOLD: 7,
};

let childrenList = [];
let activeChildId = null;
let currentUser = null;
let calendarWeekOffset = 0;
let calendarModalDate = null;
let calendarModalRowId = null;
let todayData = { meals: 0, napMinutes: 0, diapers: 0, activity: '' };
let napPickerTemp = 0; // minutes en cours d'édition dans la modale sieste
// Dynamic getter to avoid null references when parts of the UI are hidden
function getTableBody() {
    return document.querySelector('#attendanceTable tbody');
}
const defaultPhotoUrl = "https://ui-avatars.com/api/?name=Enfant&background=81c784&color=fff";

// ============================================================
// AUTH UI
// ============================================================

window.switchTab = function (tab) {
    document.querySelectorAll('.auth-tab').forEach((t, i) => {
        t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'register' && i === 1));
    });
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
    document.getElementById('reset-form').classList.toggle('hidden', true);
    clearAuthMessages();
};

window.switchToReset = function () {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('reset-form').classList.remove('hidden');
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    clearAuthMessages();
};

function clearAuthMessages() {
    document.querySelectorAll('.auth-error, .auth-success').forEach(el => {
        el.classList.remove('show');
        el.textContent = '';
    });
}

function showAuthError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.add('show');
}

function showAuthSuccess(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.add('show');
}

function setLoading(btnId, loading, defaultText) {
    const btn = document.getElementById(btnId);
    btn.disabled = loading;
    btn.innerHTML = loading ? `<span class="auth-spinner"></span> Chargement...` : defaultText;
}

function firebaseErrorMessage(code) {
    const messages = {
        'auth/user-not-found': 'Aucun compte trouvé avec cet email.',
        'auth/wrong-password': 'Mot de passe incorrect.',
        'auth/invalid-email': 'Adresse email invalide.',
        'auth/email-already-in-use': 'Un compte existe déjà avec cet email.',
        'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
        'auth/invalid-credential': 'Email ou mot de passe incorrect.',
        'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion.',
    };
    return messages[code] || 'Une erreur est survenue. Veuillez réessayer.';
}

// ============================================================
// AUTH HANDLERS
// ============================================================

window.handleLogin = async function (e) {
    e.preventDefault();
    clearAuthMessages();

    if (!FIREBASE_CONFIGURED) {
        showConfigHelp();
        return;
    }

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    setLoading('login-btn', true, 'Se connecter');
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        showAuthError('login-error', firebaseErrorMessage(err.code));
        setLoading('login-btn', false, 'Se connecter');
    }
};

window.handleRegister = async function (e) {
    e.preventDefault();
    clearAuthMessages();

    if (!FIREBASE_CONFIGURED) {
        showConfigHelp();
        return;
    }

    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (password !== confirm) {
        showAuthError('register-error', 'Les mots de passe ne correspondent pas.');
        return;
    }

    setLoading('register-btn', true, 'Créer mon compte');
    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
        console.error('Register error:', err.code, err.message);
        showAuthError('register-error', firebaseErrorMessage(err.code) + ' (code: ' + err.code + ')');
        setLoading('register-btn', false, 'Créer mon compte');
    }
};

window.handleReset = async function (e) {
    e.preventDefault();
    clearAuthMessages();

    if (!FIREBASE_CONFIGURED) {
        showConfigHelp();
        return;
    }

    const email = document.getElementById('reset-email').value.trim();
    setLoading('reset-btn', true, 'Envoyer le lien');
    try {
        await sendPasswordResetEmail(auth, email);
        showAuthSuccess('reset-success', 'Email envoyé ! Vérifiez votre boîte mail.');
    } catch (err) {
        showAuthError('reset-error', firebaseErrorMessage(err.code));
    }
    setLoading('reset-btn', false, 'Envoyer le lien');
};

window.logout = async function () {
    if (!FIREBASE_CONFIGURED) return;
    await signOut(auth);
};

window.sendPasswordReset = async function () {
    if (!currentUser) return;
    const msg = document.getElementById('password-message');
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        msg.textContent = 'Email de réinitialisation envoyé !';
        msg.style.color = 'var(--color-primary)';
    } catch {
        msg.textContent = 'Erreur lors de l\'envoi.';
        msg.style.color = 'var(--color-danger)';
    }
    setTimeout(() => { msg.textContent = ''; }, 4000);
};

window.showConfigHelp = function () {
    alert(
        "Pour activer les comptes Firebase :\n\n" +
        "1. Allez sur https://console.firebase.google.com\n" +
        "2. Créez un nouveau projet (gratuit)\n" +
        "3. Activez Authentication > Email/Password\n" +
        "4. Créez une base Firestore (mode production)\n" +
        "5. Dans Paramètres du projet > Vos applications > Web\n" +
        "6. Copiez la config firebaseConfig\n" +
        "7. Collez-la dans script.js à la place de FIREBASE_CONFIG\n\n" +
        "C'est tout !"
    );
};

// ============================================================
// ETAT AUTH - Connexion/Déconnexion
// ============================================================

if (FIREBASE_CONFIGURED) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;

            // 1. Reveal layout and show Home immediately
            document.getElementById('auth-overlay').classList.add('hidden');
            document.getElementById('app-layout').classList.remove('hidden');
            document.getElementById('nav-user-email').textContent = user.email;
            const avatarEl = document.getElementById('sidebar-avatar');
            if (avatarEl) avatarEl.textContent = user.email.charAt(0).toUpperCase();

            // Set today's date on home page
            const homeDateEl = document.getElementById('home-date');
            if (homeDateEl) {
                const now = new Date();
                const formatted = now.toLocaleDateString('fr-FR', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                });
                homeDateEl.textContent = formatted.charAt(0).toUpperCase() + formatted.slice(1);
            }

            // Show page 'home' right away
            showPage('home');

            // 2. Load data in background and refresh if still on home
            await loadUserData();
            await loadSettings();

            // If the user hasn't switched away, refresh the dashboard with loaded data
            const homeBtn = document.getElementById('nav-btn-home');
            if (homeBtn && homeBtn.classList.contains('active')) {
                renderChildrenCards();
                renderDashboardSummaries();
            }
        } else {
            currentUser = null;
            childrenList = [];
            activeChildId = null;
            document.getElementById('auth-overlay').classList.remove('hidden');
            document.getElementById('app-layout').classList.add('hidden');
            document.getElementById('nav-user-email').textContent = '';
            setLoading('login-btn', false, 'Se connecter');
            setLoading('register-btn', false, 'Créer mon compte');
        }
    });
}

// ============================================================
// FIRESTORE - Lecture / Ecriture par utilisateur
// ============================================================

function userRef(path) {
    return doc(db, 'users', currentUser.uid, ...path.split('/'));
}

function userCol(path) {
    return collection(db, 'users', currentUser.uid, ...path.split('/'));
}

async function loadUserData() {
    childrenList = [];
    const snap = await getDocs(userCol('children'));
    snap.forEach(d => {
        childrenList.push({ id: d.id, ...d.data() });
    });

    childrenList.forEach(child => {
        if (!child.photoUrl) child.photoUrl = defaultPhotoUrl;
    });

    await initializeGlobalCache();

    if (childrenList.length > 0) {
        activeChildId = childrenList[0].id;
        await loadAttendance(activeChildId);
    }

    renderChildrenCards();
    renderDashboardSummaries();
}

async function saveChild(child) {
    if (!currentUser) throw new Error("Utilisateur non connecté. Veuillez vous reconnecter.");
    const { id, ...data } = child;
    console.log(`[Firebase] Sauvegarde de l'enfant: ${data.name} (ID: ${id})...`);
    
    // Timeout logic to prevent eternal hang - increased to 30s
    const savePromise = setDoc(doc(db, 'users', currentUser.uid, 'children', String(id)), data);
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Délai d'attente Firebase dépassé (30s). Vérifiez votre connexion internet.")), 30000)
    );

    try {
        await Promise.race([savePromise, timeoutPromise]);
        console.log(`[Firebase] Enfant ${data.name} sauvegardé avec succès !`);
    } catch (err) {
        console.error(`[Firebase] Erreur lors de la sauvegarde de ${data.name}:`, err);
        throw err;
    }
}

async function deleteChildFromDB(childId) {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'children', String(childId)));
    const attendanceSnap = await getDocs(userCol(`attendance_${childId}`));
    for (const d of attendanceSnap.docs) {
        await deleteDoc(d.ref);
    }
}

async function saveAttendanceRow(childId, rowId, data) {
    await setDoc(doc(db, 'users', currentUser.uid, `attendance_${childId}`, String(rowId)), data);
}

async function deleteAttendanceRow(childId, rowId) {
    await deleteDoc(doc(db, 'users', currentUser.uid, `attendance_${childId}`, String(rowId)));
}

async function loadAttendanceFromDB(childId) {
    const snap = await getDocs(userCol(`attendance_${childId}`));
    const rows = [];
    snap.forEach(d => rows.push({ rowId: d.id, ...d.data() }));
    rows.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    return rows;
}

// ============================================================
// DONNÉES JOURNALIÈRES (repas / sieste / couches / activité)
// ============================================================

function getTodayStr() {
    return new Date().toISOString().split('T')[0];
}

async function loadDailyData(childId) {
    if (!currentUser || !childId) return;
    const snap = await getDoc(doc(db, 'users', currentUser.uid, 'daily_' + childId, getTodayStr()));
    todayData = snap.exists()
        ? { meals: 0, napMinutes: 0, diapers: 0, activity: '', ...snap.data() }
        : { meals: 0, napMinutes: 0, diapers: 0, activity: '' };
    renderTodayCard();
}

async function saveDailyData() {
    if (!currentUser || !activeChildId) return;
    await setDoc(doc(db, 'users', currentUser.uid, 'daily_' + activeChildId, getTodayStr()), todayData);
}

function renderTodayCard() {
    // Repas
    for (let i = 0; i < 3; i++) {
        const dot = document.getElementById(`meal-dot-${i}`);
        if (dot) dot.classList.toggle('active', i < todayData.meals);
    }
    // Sieste
    const napLabel = document.getElementById('nap-label');
    if (napLabel) {
        if (todayData.napMinutes > 0) {
            const h = Math.floor(todayData.napMinutes / 60);
            const m = todayData.napMinutes % 60;
            napLabel.textContent = h > 0 ? `${h}H${String(m).padStart(2, '0')}` : `${m}MIN`;
        } else {
            napLabel.textContent = '--';
        }
    }
    // Couches
    const diaperLabel = document.getElementById('diaper-label');
    if (diaperLabel) diaperLabel.textContent = `X${todayData.diapers}`;
    // Activité
    const activityEl = document.getElementById('activity-display');
    if (activityEl && activityEl.tagName !== 'INPUT') {
        activityEl.textContent = todayData.activity || 'ACTIVITÉ';
    }
}

window.setMeals = function (n) {
    // Clic sur le même dot actif → réinitialise à 0
    todayData.meals = todayData.meals === n ? 0 : n;
    renderTodayCard();
    saveDailyData();
};

window.adjustDiapers = function (delta) {
    todayData.diapers = Math.max(0, todayData.diapers + delta);
    renderTodayCard();
    saveDailyData();
};

window.openNapPicker = function () {
    napPickerTemp = todayData.napMinutes;
    updateNapModal();
    document.getElementById('nap-picker-modal').classList.remove('hidden');
};

window.closeNapPicker = function () {
    document.getElementById('nap-picker-modal').classList.add('hidden');
};

window.adjustNapTemp = function (delta) {
    napPickerTemp = Math.max(0, napPickerTemp + delta);
    updateNapModal();
};

function updateNapModal() {
    document.getElementById('nap-modal-hours').textContent = Math.floor(napPickerTemp / 60);
    document.getElementById('nap-modal-mins').textContent = String(napPickerTemp % 60).padStart(2, '0');
}

window.saveNap = async function () {
    todayData.napMinutes = napPickerTemp;
    renderTodayCard();
    await saveDailyData();
    closeNapPicker();
};

window.editActivity = function () {
    const el = document.getElementById('activity-display');
    if (!el || el.tagName === 'INPUT') return;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = todayData.activity || '';
    input.placeholder = 'Ex: Dessin, Lecture…';
    input.className = 'activity-text';
    input.style.cssText = 'border:none;border-bottom:2px solid var(--primary);outline:none;background:transparent;width:80px;font-weight:800;font-size:0.9rem;';
    input.maxLength = 20;
    el.replaceWith(input);
    input.focus();
    input.select();
    const save = async () => {
        todayData.activity = input.value.trim().toUpperCase();
        const div = document.createElement('div');
        div.className = 'activity-text';
        div.id = 'activity-display';
        div.style.cursor = 'pointer';
        div.onclick = editActivity;
        div.textContent = todayData.activity || 'ACTIVITÉ';
        input.replaceWith(div);
        await saveDailyData();
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
};

// ============================================================
// TRAITEMENTS MÉDICAUX
// ============================================================

let treatmentModalId = null;
let treatmentFreq = 1;

async function loadTreatments(childId) {
    const list = document.getElementById('treatments-list');
    if (!list || !currentUser) return;
    list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">Chargement...</p>';
    const snap = await getDocs(collection(db, 'users', currentUser.uid, 'treatments_' + childId));
    const treatments = [];
    snap.forEach(d => treatments.push({ id: d.id, ...d.data() }));
    renderTreatments(treatments);
}

function renderTreatments(treatments) {
    const list = document.getElementById('treatments-list');
    if (!list) return;
    if (treatments.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">Aucun traitement en cours.</p>';
        return;
    }
    list.innerHTML = treatments.map(t => `
        <div class="treatment-row" onclick="editTreatment('${t.id}','${(t.medication||'').replace(/'/g,"\\'")}','${(t.reason||'').replace(/'/g,"\\'")}',${t.frequency||1})">
            <span class="treatment-reason">${t.reason || '—'}</span>
            <div class="treatment-divider"></div>
            <span class="material-icons treatment-icon">medication</span>
            <span class="treatment-name">${t.medication}</span>
            <div class="treatment-divider"></div>
            <span class="treatment-freq">X${t.frequency || 1} PAR JOUR</span>
        </div>
    `).join('');
}

window.openTreatmentModal = function () {
    treatmentModalId = null;
    treatmentFreq = 1;
    document.getElementById('treatment-medication').value = '';
    document.getElementById('treatment-reason').value = '';
    document.getElementById('treatment-freq-display').textContent = '1';
    document.getElementById('treatment-modal-title').textContent = 'Ajouter un traitement';
    document.getElementById('treatment-delete-btn').style.display = 'none';
    document.getElementById('treatment-modal').classList.remove('hidden');
};

window.editTreatment = function (id, medication, reason, frequency) {
    treatmentModalId = id;
    treatmentFreq = frequency || 1;
    document.getElementById('treatment-medication').value = medication;
    document.getElementById('treatment-reason').value = reason;
    document.getElementById('treatment-freq-display').textContent = treatmentFreq;
    document.getElementById('treatment-modal-title').textContent = 'Modifier le traitement';
    document.getElementById('treatment-delete-btn').style.display = 'block';
    document.getElementById('treatment-modal').classList.remove('hidden');
};

window.closeTreatmentModal = function () {
    document.getElementById('treatment-modal').classList.add('hidden');
    treatmentModalId = null;
};

window.adjustTreatmentFreq = function (delta) {
    treatmentFreq = Math.max(1, Math.min(10, treatmentFreq + delta));
    document.getElementById('treatment-freq-display').textContent = treatmentFreq;
};

window.saveTreatment = async function () {
    const medication = document.getElementById('treatment-medication').value.trim();
    if (!medication || !activeChildId || !currentUser) return;
    const reason = document.getElementById('treatment-reason').value.trim();
    const btn = document.getElementById('treatment-save-btn');
    btn.disabled = true;
    btn.textContent = 'Enregistrement...';
    try {
        const id = treatmentModalId || Date.now().toString();
        await setDoc(doc(db, 'users', currentUser.uid, 'treatments_' + activeChildId, id), {
            medication,
            reason,
            frequency: treatmentFreq,
        });
        await loadTreatments(activeChildId);
        closeTreatmentModal();
    } catch (err) {
        alert('Erreur : ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enregistrer';
    }
};

window.deleteTreatment = async function () {
    if (!treatmentModalId || !activeChildId || !currentUser) return;
    if (!confirm('Supprimer ce traitement ?')) return;
    await deleteDoc(doc(db, 'users', currentUser.uid, 'treatments_' + activeChildId, treatmentModalId));
    await loadTreatments(activeChildId);
    closeTreatmentModal();
};

async function saveSettings(data) {
    await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'rates'), data);
}

async function loadSettingsFromDB() {
    const snap = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'rates'));
    return snap.exists() ? snap.data() : null;
}

// ============================================================
// CALENDRIER GLOBAL (tous enfants)
// ============================================================

const CHILD_COLORS = ['#CEF17B', '#FFD166', '#FF6B6B', '#74C0FC', '#DA77F2', '#69DB7C'];
const CHILD_TEXT_COLORS = ['#1C2B1A', '#5C3D00', '#5C0000', '#0C3A6B', '#4A1060', '#0A3A0A'];
let globalCalOffset = 0;

async function renderGlobalCalendar() {
    const days = getWeekDays(globalCalOffset);
    const todayStr = new Date().toISOString().split('T')[0];
    const dayNames = ['LUN', 'MAR', 'MER', 'JEU', 'VEN'];

    // Update nav label
    const label = document.getElementById('global-cal-label');
    if (label) {
        if (globalCalOffset === 0) {
            label.textContent = "AUJOURD'HUI";
        } else {
            const s = days[0], e = days[4];
            label.textContent = `${s.getDate()}/${s.getMonth() + 1} - ${e.getDate()}/${e.getMonth() + 1}`;
        }
    }

    // Update day headers
    const daysContainer = document.getElementById('global-cal-days');
    if (daysContainer) {
        daysContainer.innerHTML = days.map((d, i) => {
            const dateStr = d.toISOString().split('T')[0];
            return `<div class="cal-day${dateStr === todayStr ? ' active' : ''}">${dayNames[i]}.${d.getDate()}</div>`;
        }).join('');
    }

    // Load attendance for all children
    const allData = {};
    for (const child of childrenList) {
        const rows = await loadAttendanceFromDB(child.id);
        allData[child.id] = {};
        rows.forEach(r => {
            if (r.date) allData[child.id][r.date] = { timeIn: r.timeIn, timeOut: r.timeOut };
        });
    }

    // Legend
    const legend = document.getElementById('global-cal-legend');
    if (legend) {
        if (childrenList.length === 0) {
            legend.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Aucun enfant. Ajoutez des enfants depuis l'accueil.</p>';
        } else {
            legend.innerHTML = childrenList.map((child, i) => `
                <div class="legend-item">
                    <div class="legend-dot" style="background:${CHILD_COLORS[i % CHILD_COLORS.length]};"></div>
                    <span>${child.name}</span>
                </div>
            `).join('');
        }
    }

    // Render day columns
    const columns = document.getElementById('global-cal-columns');
    if (!columns) return;
    columns.innerHTML = '';

    days.forEach((d) => {
        const dateStr = d.toISOString().split('T')[0];
        const dayCol = document.createElement('div');
        dayCol.className = 'global-day-col' + (dateStr === todayStr ? ' active' : '');

        if (childrenList.length === 0) {
            columns.appendChild(dayCol);
            return;
        }

        childrenList.forEach((child, childIdx) => {
            const data = allData[child.id]?.[dateStr];
            const color = CHILD_COLORS[childIdx % CHILD_COLORS.length];
            const subCol = document.createElement('div');
            subCol.className = 'global-child-col';

            if (data && data.timeIn && data.timeOut) {
                const bar = document.createElement('div');
                const startMins = timeToMins(data.timeIn);
                const endMins = timeToMins(data.timeOut);
                const totalMins = (18 - 7) * 60;
                const offsetMins = 7 * 60;
                bar.style.cssText = `
                    position: absolute;
                    left: 3px; right: 3px;
                    top: ${Math.max(0, ((startMins - offsetMins) / totalMins) * 100)}%;
                    height: ${Math.max(2, ((endMins - startMins) / totalMins) * 100)}%;
                    background: ${color};
                    border-radius: 8px;
                    opacity: 0.9;
                `;
                bar.title = `${child.name} : ${data.timeIn} → ${data.timeOut}`;
                subCol.appendChild(bar);
            }
            dayCol.appendChild(subCol);
        });

        columns.appendChild(dayCol);
    });
}

window.globalCalPrev = function () { globalCalOffset--; renderGlobalCalendar(); };
window.globalCalNext = function () { globalCalOffset++; renderGlobalCalendar(); };
window.globalCalToday = function () { globalCalOffset = 0; renderGlobalCalendar(); };

// ============================================================
// NAVIGATION
// ============================================================

window.showPage = function (pageId) {
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
    });
    const page = document.getElementById(`${pageId}-page`);
    if (page) {
        page.classList.add('active');
        page.classList.remove('hidden');
    }
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-btn-${pageId}`);
    if (activeBtn) activeBtn.classList.add('active');

    if (pageId === 'home') {
        renderChildrenCards();
        renderDashboardSummaries();
    }
    if (pageId === 'calendar-global') {
        renderGlobalCalendar();
    }
    if (pageId === 'settings') {
        loadSettings();
        updateSettingsChildFields();
    }
};

// ============================================================
// GESTION DES ENFANTS
// ============================================================

function renderChildrenCards() {
    const container = document.getElementById('children-cards-container');
    if (!container) return;
    container.innerHTML = '';
    childrenList.forEach(child => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'child-photo-btn' + (child.id === activeChildId ? ' active' : '');
        btn.title = child.name;
        btn.onclick = () => selectChild(child.id);
        btn.innerHTML = `
            <img src="${child.photoUrl || defaultPhotoUrl}" alt="Photo de ${child.name}" class="child-photo-img">
            <span class="child-photo-name">${child.name}</span>
        `;
        container.appendChild(btn);
    });
}

function renderDashboardSummaries() {
    const container = document.getElementById('dashboard-summaries');
    if (!container) return;
    container.innerHTML = '';

    if (childrenList.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 40px; background: var(--card); border-radius: var(--radius); border: 1px dashed var(--border); margin-top: 20px;">
                <p style="color:var(--text-muted); font-weight:600; margin-bottom: 20px;">Aucun enfant pour l'instant. Commencez par en ajouter un !</p>
                <button class="action-button" onclick="addChild()" style="padding: 12px 24px;">+ AJOUTER MON PREMIER ENFANT</button>
            </div>
        `;
        return;
    }

    let globalBase = 0, globalFrais = 0, globalTotal = 0;

    childrenList.forEach(child => {
        const cache = childTotalsCache[child.id] || { totalFrais: 0, totalMonthly: 0 };
        const base = parseFloat(child.baseMonthlySalary) || 0;
        const frais = parseFloat(cache.totalFrais) || 0;
        const total = base + frais;

        const card = document.createElement('div');
        card.className = 'dashboard-child-summary';
        card.style.display = 'flex';
        card.innerHTML = `
            <h3 class="dcs-name">${child.name}</h3>
            <div class="dcs-figures">
                <div class="dcs-figure">
                    <span class="dcs-label">Mensualisation</span>
                    <span class="dcs-value">${base.toFixed(2)}€</span>
                </div>
                <div class="dcs-figure">
                    <span class="dcs-label">Frais Réel</span>
                    <span class="dcs-value">${frais.toFixed(2)}€</span>
                </div>
                <div class="dcs-figure highlight" style="background: #d4f895 !important;">
                    <span class="dcs-label" style="color: #1a1a2e !important; font-weight: 800;">Total Facture</span>
                    <span class="dcs-value" style="color: #1a1a2e !important; font-weight: 900;">${total.toFixed(2)}€</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Update global boxes
    const box1 = document.getElementById('global-box-1');
    const box2 = document.getElementById('global-box-2');
    const box3 = document.getElementById('global-box-3');

    if (box1) box1.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:4px;"><span style="font-size:0.7rem; font-weight:800; color:#888;">MENSUALISATION</span><span style="font-size:1.3rem; font-weight:900;">${globalBase.toFixed(2)}€</span></div>`;
    if (box2) box2.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:4px;"><span style="font-size:0.7rem; font-weight:800; color:#888;">FRAIS RÉEL</span><span style="font-size:1.3rem; font-weight:900;">${globalFrais.toFixed(2)}€</span></div>`;
    if (box3) box3.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:4px; background:#d4f895; border-radius:12px;"><span style="font-size:0.7rem; font-weight:800; color:#1a1a2e;">TOTAL FACTURE</span><span style="font-size:1.3rem; font-weight:900;">${globalTotal.toFixed(2)}€</span></div>`;
}

window.selectChild = async function (id, stayOnPage = false) {
    activeChildId = id;
    const child = childrenList.find(c => c.id === id);
    if (child) {
        // Update child-detail-page header
        const nameEl = document.getElementById('attendance-child-name');
        const ageEl = document.getElementById('attendance-child-age');
        const photoEl = document.getElementById('attendance-child-photo');
        // Update attendance-page title
        const attNameEl = document.getElementById('attendance-page-child-name');

        if (nameEl) nameEl.textContent = child.name;
        if (ageEl) ageEl.textContent = `${calculateAge(child.birthdate)} ANS`;
        if (photoEl) photoEl.src = child.photoUrl || defaultPhotoUrl;
        if (attNameEl) attNameEl.textContent = child.name;

        if (!stayOnPage) {
            showPage('child-detail');
        }

        // Load data in background to keep UI snappy
        const loadProcess = async () => {
            try {
                await loadAttendance(id);
                await loadDailyData(id);
                await loadTreatments(id);
                renderChildrenCards();
                updateSettingsChildFields();
                renderVisualCalendar();

                // Update billing summary in child-detail-page
                const cache = childTotalsCache[id] || { totalFrais: 0, totalMonthly: 0, totalHours: 0 };
                
                if (stayOnPage) renderDashboardSummaries();
            } catch (err) {
                console.error("Error loading child data in background:", err);
            }
        };

        loadProcess();
    }
};

function calculateAge(birthdate) {
    if (!birthdate) return "--";
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function getWeekDays(offset) {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
    const days = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
    }
    return days;
}

function renderVisualCalendar() {
    const columns = document.getElementById('calendar-columns');
    if (!columns) return;

    const days = getWeekDays(calendarWeekOffset);
    const todayStr = new Date().toISOString().split('T')[0];
    const dayNames = ['LUN', 'MAR', 'MER', 'JEU', 'VEN'];

    // Build attendance map from DOM table
    const table = document.getElementById('attendanceTable');
    const tbody = table ? table.querySelector('tbody') : null;
    const attendanceMap = {};
    if (tbody) {
        tbody.querySelectorAll('tr').forEach(row => {
            const date = row.querySelector('.date-field')?.value;
            if (date) {
                attendanceMap[date] = {
                    timeIn: row.querySelector('.time-in')?.value || '08:00',
                    timeOut: row.querySelector('.time-out')?.value || '17:00',
                    overtime: row.querySelector('.overtime-hours')?.value || '0',
                    mealCost: row.querySelector('.meal-cost')?.value || RATES.MEAL.toFixed(2),
                    rowId: row.dataset.rowId
                };
            }
        });
    }

    // Update day labels
    days.forEach((d, i) => {
        const dateStr = d.toISOString().split('T')[0];
        const dayEl = document.getElementById(`cal-day-${i}`);
        if (dayEl) {
            dayEl.textContent = `${dayNames[i]}.${d.getDate()}`;
            dayEl.classList.toggle('active', dateStr === todayStr);
        }
    });

    // Update nav label
    const calCurrent = document.querySelector('.cal-current');
    if (calCurrent) {
        if (calendarWeekOffset === 0) {
            calCurrent.textContent = "AUJOURD'HUI";
        } else {
            const s = days[0], e = days[4];
            calCurrent.textContent = `${s.getDate()}/${s.getMonth() + 1} - ${e.getDate()}/${e.getMonth() + 1}`;
        }
    }

    // Update bars
    days.forEach((d, i) => {
        const dateStr = d.toISOString().split('T')[0];
        const col = document.getElementById(`cal-col-${i}`);
        if (!col) return;
        col.dataset.date = dateStr;
        col.classList.toggle('active', dateStr === todayStr);

        const bar = col.querySelector('.cal-bar');
        const data = attendanceMap[dateStr];
        if (bar) {
            if (data) {
                const startMins = timeToMins(data.timeIn);
                const endMins = timeToMins(data.timeOut);
                const totalMins = (18 - 7) * 60;
                const offsetMins = 7 * 60;
                bar.style.top = `${Math.max(0, ((startMins - offsetMins) / totalMins) * 100)}%`;
                bar.style.height = `${Math.max(2, ((endMins - startMins) / totalMins) * 100)}%`;
                bar.style.display = 'block';
            } else {
                bar.style.display = 'none';
            }
        }
    });
}

window.calendarPrev = function () { calendarWeekOffset--; renderVisualCalendar(); };
window.calendarNext = function () { calendarWeekOffset++; renderVisualCalendar(); };
window.calendarGoToday = function () { calendarWeekOffset = 0; renderVisualCalendar(); };

window.openDayModal = function (dateStr) {
    if (!activeChildId || !dateStr) return;
    calendarModalDate = dateStr;
    calendarModalRowId = null;

    // Chercher données existantes dans le tableau
    const table = document.getElementById('attendanceTable');
    const tbody = table ? table.querySelector('tbody') : null;
    let existing = null;
    if (tbody) {
        tbody.querySelectorAll('tr').forEach(row => {
            if (row.querySelector('.date-field')?.value === dateStr) {
                existing = {
                    timeIn: row.querySelector('.time-in')?.value,
                    timeOut: row.querySelector('.time-out')?.value,
                    overtime: row.querySelector('.overtime-hours')?.value,
                    mealCost: row.querySelector('.meal-cost')?.value,
                };
                calendarModalRowId = row.dataset.rowId;
            }
        });
    }

    const d = new Date(dateStr + 'T00:00:00');
    const label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('day-modal-date-label').textContent = label;
    document.getElementById('day-modal-title').textContent = existing ? 'Modifier la présence' : 'Ajouter une présence';
    document.getElementById('day-modal-time-in').value = existing?.timeIn || '08:00';
    document.getElementById('day-modal-time-out').value = existing?.timeOut || '17:00';
    document.getElementById('day-modal-meal').value = existing?.mealCost || RATES.MEAL.toFixed(2);
    document.getElementById('day-modal-overtime').value = existing?.overtime || '0';
    document.getElementById('day-modal-delete-btn').style.display = existing ? 'block' : 'none';

    document.getElementById('day-presence-modal').classList.remove('hidden');
};

window.closeDayModal = function () {
    document.getElementById('day-presence-modal').classList.add('hidden');
    calendarModalDate = null;
    calendarModalRowId = null;
};

window.saveDayPresence = async function () {
    if (!calendarModalDate || !activeChildId) return;

    const timeIn = document.getElementById('day-modal-time-in').value;
    const timeOut = document.getElementById('day-modal-time-out').value;
    const mealCost = document.getElementById('day-modal-meal').value;
    const overtime = document.getElementById('day-modal-overtime').value;

    const rowId = calendarModalRowId || Date.now().toString();
    const btn = document.getElementById('day-modal-save-btn');
    btn.disabled = true;
    btn.textContent = 'Enregistrement...';

    try {
        await saveAttendanceRow(activeChildId, rowId, {
            date: calendarModalDate,
            timeIn,
            timeOut,
            overtime,
            mealCost,
        });
        await loadAttendance(activeChildId);
        renderVisualCalendar();
        closeDayModal();
    } catch (err) {
        alert('Erreur : ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Enregistrer';
    }
};

window.deleteDayPresence = async function () {
    if (!calendarModalRowId || !activeChildId) return;
    if (!confirm('Supprimer la présence de ce jour ?')) return;
    await deleteAttendanceRow(activeChildId, calendarModalRowId);
    await loadAttendance(activeChildId);
    renderVisualCalendar();
    closeDayModal();
};

function timeToMins(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

window.addChild = function () {
    const modal = document.getElementById('add-child-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('add-child-form').reset();
    }
};

window.closeAddChildModal = function () {
    const modal = document.getElementById('add-child-modal');
    if (modal) modal.classList.add('hidden');
};

window.handleChildSubmit = async function (e) {
    e.preventDefault();
    const name = document.getElementById('new-child-name').value.trim();
    const birthdate = document.getElementById('new-child-birthdate').value;
    const salary = parseFloat(document.getElementById('new-child-salary').value) || 0;

    if (!name) return;

    const submitBtn = document.getElementById('add-child-submit-btn');
    if (!submitBtn) return;
    const originalLabel = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="material-icons rotating">sync</span> Enregistrement...';

    try {
        const newId = Date.now().toString();
        const newChild = { id: newId, name, birthdate, baseMonthlySalary: salary, photoUrl: defaultPhotoUrl };

        await saveChild(newChild);

        childrenList.push(newChild);
        activeChildId = newId;
        renderChildrenCards();
        renderDashboardSummaries();
        closeAddChildModal();
        showPage('home');

    } catch (err) {
        console.error("Error in handleChildSubmit:", err);
        alert("Erreur lors de la sauvegarde : " + err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalLabel;
    }
};

window.deleteChild = async function (childId) {
    const child = childrenList.find(c => c.id === childId);
    if (!child) return;
    if (!confirm(`Supprimer ${child.name} et TOUTES ses données ? Cette action est irréversible.`)) return;
    childrenList = childrenList.filter(c => c.id !== childId);
    delete childTotalsCache[childId];
    await deleteChildFromDB(childId);
    if (activeChildId === childId) {
        activeChildId = childrenList.length > 0 ? childrenList[0].id : null;
        if (activeChildId) await loadAttendance(activeChildId);
        else {
            const tb = getTableBody();
            if (tb) tb.innerHTML = '';
        }
    }
    showPage('home');
};

window.openChildSettings = function (childId) {
    activeChildId = childId;
    updateSettingsChildFields();
    showPage('settings');
};

// ============================================================
// FEUILLE DE PRÉSENCE
// ============================================================

async function loadAttendance(childId) {
    const rows = await loadAttendanceFromDB(childId);
    const tb = getTableBody();
    if (tb) {
        tb.innerHTML = '';
        rows.forEach(data => createRow(data, false));
    }
    updateMonthlyTotals();
}

async function saveAttendance() {
    if (!activeChildId) return;
    const rows = [];
    const tb = getTableBody();
    if (!tb) return;
    tb.querySelectorAll('tr').forEach(row => {
        rows.push({
            rowId: row.dataset.rowId,
            date: row.querySelector('.date-field').value,
            timeIn: row.querySelector('.time-in').value,
            timeOut: row.querySelector('.time-out').value,
            overtime: row.querySelector('.overtime-hours').value,
            mealCost: row.querySelector('.meal-cost').value,
        });
    });
    for (const r of rows) {
        await saveAttendanceRow(activeChildId, r.rowId, {
            date: r.date,
            timeIn: r.timeIn,
            timeOut: r.timeOut,
            overtime: r.overtime,
            mealCost: r.mealCost,
        });
    }
}

function createRow(data = {}, shouldSave = true) {
    const tb = getTableBody();
    if (!tb) return;
    const newRow = tb.insertRow();
    const rowId = data.rowId || Date.now().toString();
    newRow.dataset.rowId = rowId;
    newRow.dataset.hours = 0;
    newRow.dataset.overtime = 0;
    newRow.dataset.indemnity = 0;
    newRow.dataset.meal = 0;
    newRow.dataset.totalDayCost = 0;

    newRow.innerHTML = `
        <td><input type="date" class="data-input date-field" value="${data.date || ''}"></td>
        <td><input type="time" class="data-input time-in" value="${data.timeIn || '08:00'}"></td>
        <td><input type="time" class="data-input time-out" value="${data.timeOut || '17:00'}"></td>
        <td class="total-hours">0h00</td>
        <td><input type="number" step="0.01" min="0" class="data-input overtime-hours" value="${data.overtime || '0.00'}"></td>
        <td class="indemnity-cost">0.00 €</td>
        <td><input type="number" step="0.01" min="0" class="data-input meal-cost" value="${data.mealCost || RATES.MEAL.toFixed(2)}"></td>
        <td class="total-day">0.00 €</td>
        <td>
            <button onclick="duplicateRow(this)" title="Dupliquer">📄</button>
            <button onclick="deleteRow(this)">🗑️</button>
        </td>
    `;

    newRow.querySelectorAll('.time-in, .time-out, .overtime-hours, .meal-cost, .date-field').forEach(input => {
        input.onchange = () => updateRowFromInput(input);
        if (input.type === 'number' || input.type === 'date') input.oninput = () => updateRowFromInput(input);
    });

    updateRowCalculations(newRow);

    if (shouldSave) {
        saveAttendanceRow(activeChildId, rowId, {
            date: data.date || '',
            timeIn: data.timeIn || '08:00',
            timeOut: data.timeOut || '17:00',
            overtime: data.overtime || '0.00',
            mealCost: data.mealCost || RATES.MEAL.toFixed(2),
        });
    }

    return newRow;
}

function updateRowFromInput(inputElement) {
    const row = inputElement.closest('tr');
    updateRowCalculations(row);
    const rowData = {
        date: row.querySelector('.date-field').value,
        timeIn: row.querySelector('.time-in').value,
        timeOut: row.querySelector('.time-out').value,
        overtime: row.querySelector('.overtime-hours').value,
        mealCost: row.querySelector('.meal-cost').value,
    };
    saveAttendanceRow(activeChildId, row.dataset.rowId, rowData);
    renderVisualCalendar();
}

window.deleteRow = async function (button) {
    const row = button.closest('tr');
    const rowId = row.dataset.rowId;
    row.remove();
    await deleteAttendanceRow(activeChildId, rowId);
    updateMonthlyTotals();
};

window.addRow = function () {
    createRow({
        date: new Date().toISOString().split('T')[0],
        timeIn: '08:00',
        timeOut: '17:00',
        overtime: '0.00',
        mealCost: RATES.MEAL.toFixed(2)
    });
};

window.duplicateRow = function (button) {
    const row = button.closest('tr');
    const existingData = {
        date: row.querySelector('.date-field').value,
        timeIn: row.querySelector('.time-in').value,
        timeOut: row.querySelector('.time-out').value,
        overtime: row.querySelector('.overtime-hours').value,
        mealCost: row.querySelector('.meal-cost').value,
    };
    const newRow = createRow({ ...existingData, date: '' }, true);
    row.parentNode.insertBefore(newRow, row.nextSibling);
    updateMonthlyTotals();
};

// ============================================================
// CALCULS
// ============================================================

function calculateDuration(timeIn, timeOut) {
    if (!timeIn || !timeOut) return 0;
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    let d = toMin(timeOut) - toMin(timeIn);
    if (d < 0) d += 24 * 60;
    return d / 60;
}

function updateRowCalculations(row) {
    const hours = calculateDuration(row.querySelector('.time-in').value, row.querySelector('.time-out').value);
    const overtime = parseFloat(row.querySelector('.overtime-hours').value) || 0;
    const mealCost = parseFloat(row.querySelector('.meal-cost').value) || 0;
    const totalH = hours + overtime;

    row.querySelector('.total-hours').textContent = `${Math.floor(totalH)}h${String(Math.round((totalH % 1) * 60)).padStart(2, '0')}`;

    let maintenance = 0;
    if (hours > 0) maintenance = hours < RATES.MAINTENANCE_THRESHOLD ? RATES.MAINTENANCE_MINIMUM : hours * RATES.MAINTENANCE_COEFF;
    row.querySelector('.indemnity-cost').textContent = maintenance.toFixed(2) + ' €';

    const total = (hours * RATES.HOURLY) + (overtime * RATES.OVERTIME_HOURLY) + maintenance + mealCost;
    row.querySelector('.total-day').textContent = total.toFixed(2) + ' €';

    row.dataset.hours = hours.toFixed(2);
    row.dataset.overtime = overtime.toFixed(2);
    row.dataset.indemnity = maintenance.toFixed(2);
    row.dataset.meal = mealCost.toFixed(2);
    row.dataset.totalDayCost = total.toFixed(2);

    updateMonthlyTotals();
}

function updateMonthlyTotals() {
    const child = childrenList.find(c => c.id === activeChildId);
    if (!child) {
        const resetIds = ['footer-totalHours', 'footer-totalOvertime', 'footer-totalIndemnity', 'footer-totalMeals', 'footer-totalMonthly',
                          'footer-totalHours-att', 'footer-totalOvertime-att', 'footer-totalIndemnity-att', 'footer-totalMeals-att', 'footer-totalMonthly-att'];
        resetIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = id.includes('Hours') || id.includes('Overtime') ? '0h00' : '0.00 €';
        });
        updateHomeSummary(0, 0);
        updateGlobalSummary();
        return;
    }

    let totalH = 0, totalOT = 0, totalInd = 0, totalMeals = 0;
    const tb = getTableBody();
    if (!tb) return;
    tb.querySelectorAll('tr').forEach(row => {
        totalH += parseFloat(row.dataset.hours || 0);
        totalOT += parseFloat(row.dataset.overtime || 0);
        totalInd += parseFloat(row.dataset.indemnity || 0);
        totalMeals += parseFloat(row.dataset.meal || 0);
    });

    const base = child.baseMonthlySalary || 0;
    const frais = totalInd + totalMeals + (totalOT * RATES.OVERTIME_HOURLY);
    const total = base + frais;

    childTotalsCache[activeChildId] = {
        totalFrais: frais,
        totalMonthly: total
    };

    const hoursStr = `${Math.floor(totalH)}h${String(Math.round((totalH % 1) * 60)).padStart(2, '0')}`;
    const overtimeStr = `${Math.floor(totalOT)}h${String(Math.round((totalOT % 1) * 60)).padStart(2, '0')}`;

    // Mise à jour des div cachées (compatibilité)
    const elH = document.getElementById('footer-totalHours');
    const elOT = document.getElementById('footer-totalOvertime');
    const elInd = document.getElementById('footer-totalIndemnity');
    const elM = document.getElementById('footer-totalMeals');
    const elTot = document.getElementById('footer-totalMonthly');
    if (elH) elH.textContent = hoursStr;
    if (elOT) elOT.textContent = overtimeStr;
    if (elInd) elInd.textContent = totalInd.toFixed(2) + ' €';
    if (elM) elM.textContent = totalMeals.toFixed(2) + ' €';
    if (elTot) elTot.textContent = total.toFixed(2) + ' €';

    // Mise à jour du footer du tableau visible
    const elHAtt = document.getElementById('footer-totalHours-att');
    const elOTAtt = document.getElementById('footer-totalOvertime-att');
    const elIndAtt = document.getElementById('footer-totalIndemnity-att');
    const elMAtt = document.getElementById('footer-totalMeals-att');
    const elTotAtt = document.getElementById('footer-totalMonthly-att');
    if (elHAtt) elHAtt.textContent = hoursStr;
    if (elOTAtt) elOTAtt.textContent = overtimeStr;
    if (elIndAtt) elIndAtt.textContent = totalInd.toFixed(2) + ' €';
    if (elMAtt) elMAtt.textContent = totalMeals.toFixed(2) + ' €';
    if (elTotAtt) elTotAtt.textContent = total.toFixed(2) + ' €';

    updateHomeSummary(base, frais);
    updateGlobalSummary();
}

function updateHomeSummary(base, frais) {
    const baseEl = document.getElementById('home-baseSalary');
    const fraisEl = document.getElementById('home-totalFrais');
    const totalEl = document.getElementById('home-totalMonthly');
    if (baseEl) baseEl.textContent = base.toFixed(2) + ' €';
    if (fraisEl) fraisEl.textContent = frais.toFixed(2) + ' €';
    if (totalEl) totalEl.textContent = (base + frais).toFixed(2) + ' €';
}

let childTotalsCache = {};

async function initializeGlobalCache() {
    childTotalsCache = {};
    for (const child of childrenList) {
        try {
            const rows = await loadAttendanceFromDB(child.id);
            let frais = 0;
            rows.forEach(row => {
                const h = calculateDuration(row.timeIn, row.timeOut);
                const ot = parseFloat(row.overtime) || 0;
                const m = h < RATES.MAINTENANCE_THRESHOLD ? RATES.MAINTENANCE_MINIMUM : h * RATES.MAINTENANCE_COEFF;
                frais += (ot * RATES.OVERTIME_HOURLY) + (h > 0 ? m : 0) + (parseFloat(row.mealCost) || 0);
            });
            childTotalsCache[child.id] = {
                totalFrais: frais,
                totalMonthly: (child.baseMonthlySalary || 0) + frais
            };
        } catch (err) {
            console.error(`Error initializing cache for ${child.name}:`, err);
            childTotalsCache[child.id] = { totalFrais: 0, totalMonthly: child.baseMonthlySalary || 0 };
        }
    }
}

function updateGlobalSummary() {
    let globalBase = 0, globalFrais = 0;
    childrenList.forEach(c => {
        globalBase += parseFloat(c.baseMonthlySalary || 0);
        const stats = childTotalsCache[c.id];
        if (stats && typeof stats.totalFrais === 'number') {
            globalFrais += stats.totalFrais;
        }
    });
    const baseEl = document.getElementById('global-baseSalary');
    const fraisEl = document.getElementById('global-totalFrais');
    const totalEl = document.getElementById('global-totalMonthly');
    
    if (baseEl) baseEl.textContent = globalBase.toFixed(2) + ' €';
    if (fraisEl) fraisEl.textContent = globalFrais.toFixed(2) + ' €';
    if (totalEl) totalEl.textContent = (globalBase + globalFrais).toFixed(2) + ' €';
}

// ============================================================
// PARAMETRES
// ============================================================

function updateSettingsChildFields() {
    const child = childrenList.find(c => c.id === activeChildId);
    const baseSalaryInput = document.getElementById('setting-base-salary');
    const childNameSpan = document.getElementById('child-name-settings');
    const deleteContainer = document.getElementById('delete-child-container');
    const photoUrlInput = document.getElementById('setting-child-photo-url');
    const photoPreview = document.getElementById('photo-preview');

    if (child) {
        baseSalaryInput.value = child.baseMonthlySalary.toFixed(2);
        childNameSpan.textContent = child.name;
        photoUrlInput.value = child.photoUrl || defaultPhotoUrl;
        photoPreview.src = child.photoUrl || defaultPhotoUrl;
        deleteContainer.innerHTML = `<button class="action-button delete-button" onclick="deleteChild('${child.id}')">🗑️ Supprimer ${child.name}</button>`;
    } else {
        baseSalaryInput.value = '0.00';
        childNameSpan.textContent = 'Non sélectionné';
        photoUrlInput.value = '';
        photoPreview.src = defaultPhotoUrl;
        deleteContainer.innerHTML = '';
    }
}

window.updateChildBaseSalary = async function () {
    const child = childrenList.find(c => c.id === activeChildId);
    const newBase = parseFloat(document.getElementById('setting-base-salary').value);
    const newPhoto = document.getElementById('setting-child-photo-url').value.trim();
    if (child && !isNaN(newBase) && newBase >= 0) {
        child.baseMonthlySalary = newBase;
        child.photoUrl = newPhoto || defaultPhotoUrl;
        await saveChild(child);
        updateMonthlyTotals();
        renderChildrenCards();
        document.getElementById('photo-preview').src = child.photoUrl;
        const msg = document.getElementById('settings-message-child');
        msg.textContent = `Paramètres de ${child.name} sauvegardés !`;
        setTimeout(() => { msg.textContent = ''; }, 3000);
    }
};

window.updatePhotoPreview = function () {
    document.getElementById('photo-preview').src = document.getElementById('setting-child-photo-url').value.trim() || defaultPhotoUrl;
};

async function loadSettings() {
    if (!currentUser) return;
    const data = await loadSettingsFromDB();
    if (data) {
        if (data.hourly) { RATES.HOURLY = data.hourly; document.getElementById('setting-hourly-rate').value = data.hourly; }
        if (data.overtime) { RATES.OVERTIME_HOURLY = data.overtime; document.getElementById('setting-overtime-hourly-rate').value = data.overtime; }
        if (data.meal !== undefined) { RATES.MEAL = data.meal; document.getElementById('setting-meal-rate').value = data.meal; }
    }
}

window.saveGlobalSettings = async function () {
    const hourly = parseFloat(document.getElementById('setting-hourly-rate').value);
    const overtime = parseFloat(document.getElementById('setting-overtime-hourly-rate').value);
    const meal = parseFloat(document.getElementById('setting-meal-rate').value);

    if (!isNaN(hourly) && hourly > 0) RATES.HOURLY = hourly;
    if (!isNaN(overtime) && overtime > 0) RATES.OVERTIME_HOURLY = overtime;
    if (!isNaN(meal) && meal >= 0) RATES.MEAL = meal;

    await saveSettings({ hourly: RATES.HOURLY, overtime: RATES.OVERTIME_HOURLY, meal: RATES.MEAL });

    const tb = getTableBody();
    if (tb) tb.querySelectorAll('tr').forEach(row => updateRowCalculations(row));
    await initializeGlobalCache();
    updateGlobalSummary();

    const msg = document.getElementById('settings-message-global');
    msg.textContent = 'Tarifs globaux sauvegardés !';
    setTimeout(() => { msg.textContent = ''; }, 3000);
};
