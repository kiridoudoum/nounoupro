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
    initializeFirestore,
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
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        useFetchStreams: false
    });
    document.getElementById('config-banner').classList.remove('show');
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
    
    // Timeout logic to prevent eternal hang
    const savePromise = setDoc(doc(db, 'users', currentUser.uid, 'children', String(id)), data);
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Délai d'attente Firebase dépassé (15s)")), 15000)
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

async function saveSettings(data) {
    await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'rates'), data);
}

async function loadSettingsFromDB() {
    const snap = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'rates'));
    return snap.exists() ? snap.data() : null;
}

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

function renderVisualCalendar() {
    const columns = document.getElementById('calendar-columns');
    if (!columns) return;

    // Clear existing bars
    const colDivs = columns.querySelectorAll('.cal-col');
    colDivs.forEach(col => {
        const bar = col.querySelector('.cal-bar');
        if (bar) bar.style.display = 'none';
    });

    // Safely get attendance rows from the table (which may be in the attendance-page)
    const table = document.getElementById('attendanceTable');
    const tbody = table ? table.querySelector('tbody') : null;
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // Map the first 5 rows of the table to the 5 calendar columns
    rows.slice(0, 5).forEach((row, idx) => {
        if (idx >= colDivs.length) return;

        const timeIn = row.querySelector('.time-in')?.value;
        const timeOut = row.querySelector('.time-out')?.value;

        if (timeIn && timeOut && timeIn !== '00:00') {
            const bar = colDivs[idx].querySelector('.cal-bar');
            if (bar) {
                const startMins = timeToMins(timeIn);
                const endMins = timeToMins(timeOut);

                // 07:00 is 0%, 18:00 is 100%
                const totalMins = (18 - 7) * 60;
                const offsetMins = 7 * 60;

                const top = ((startMins - offsetMins) / totalMins) * 100;
                const height = ((endMins - startMins) / totalMins) * 100;

                bar.style.top = `${Math.max(0, top)}%`;
                bar.style.height = `${Math.max(1, height)}%`;
                bar.style.display = 'block';
            }
        }
    });
}

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
        
        // --- OPTIMISTIC UPDATE ---
        // We add it to the local list immediately so the user sees it
        childrenList.push(newChild);
        activeChildId = newId;
        renderChildrenCards();
        renderDashboardSummaries();
        
        // Close modal and show home immediately to provide instant feedback
        closeAddChildModal();
        showPage('home');

        // Background save
        saveChild(newChild).then(async () => {
            // Success in background: you could add a small visual indicator here if you want
            console.log("Optimistic save confirmed by server.");
            // Optional: refresh data to be 100% sure sync is perfect
            await loadUserData(); 
        }).catch(err => {
            console.error("Optimistic save failed:", err);
            alert("Attention : L'enfant a été ajouté localement mais la sauvegarde sur le serveur a échoué. Vérifiez votre connexion.");
        });

    } catch (err) {
        console.error("Error in handleChildSubmit:", err);
        alert("Erreur : " + err.message);
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
        ['footer-totalHours', 'footer-totalOvertime', 'footer-totalIndemnity', 'footer-totalMeals', 'footer-totalMonthly'].forEach(id => {
            document.getElementById(id).textContent = id.includes('Hours') || id.includes('Overtime') ? '0h00' : '0.00 €';
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

    document.getElementById('footer-totalHours').textContent = `${Math.floor(totalH)}h${String(Math.round((totalH % 1) * 60)).padStart(2, '0')}`;
    document.getElementById('footer-totalOvertime').textContent = `${Math.floor(totalOT)}h${String(Math.round((totalOT % 1) * 60)).padStart(2, '0')}`;
    document.getElementById('footer-totalIndemnity').textContent = totalInd.toFixed(2) + ' €';
    document.getElementById('footer-totalMeals').textContent = totalMeals.toFixed(2) + ' €';
    document.getElementById('footer-totalMonthly').textContent = total.toFixed(2) + ' €';

    updateHomeSummary(base, frais);
    updateGlobalSummary();
}

function updateHomeSummary(base, frais) {
    document.getElementById('home-baseSalary').textContent = base.toFixed(2) + ' €';
    document.getElementById('home-totalFrais').textContent = frais.toFixed(2) + ' €';
    document.getElementById('home-totalMonthly').textContent = (base + frais).toFixed(2) + ' €';
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
