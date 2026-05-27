// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
// ADD YOUR FIREBASE CONFIG HERE
const firebaseConfig = {
    apiKey: "AIzaSyB-I2MqvcDyAgV24KVukTWAF3dMqvZQCmc",
    authDomain: "bhoomi-bytes-2d514.firebaseapp.com",
    databaseURL: "https://bhoomi-bytes-2d514-default-rtdb.firebaseio.com",
    projectId: "bhoomi-bytes-2d514",
    storageBucket: "bhoomi-bytes-2d514.firebasestorage.app",
    messagingSenderId: "402293534114",
    appId: "1:402293534114:web:86d263b66f314a7254d6fb"
};

// Initialize Firebase
let db, auth;
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    auth = firebase.auth();
}

const sensorConfigs = appConfig.sensors;
const sensorConfigByKey = sensorConfigs.reduce((configs, sensor) => {
    configs[sensor.key] = sensor;
    return configs;
}, {});

function normalizeFieldDevices(field) {
    if (!field) return {};
    const devices = {};
    if (field.deviceRegistry && typeof field.deviceRegistry === 'object') {
        Object.keys(field.deviceRegistry).forEach(deviceId => {
            if (deviceId.startsWith('device_')) {
                devices[deviceId] = {
                    id: deviceId,
                    name: field.deviceRegistry[deviceId].name || `Device ${deviceId.replace('device_', '')}`
                };
            }
        });
    }
    if (field.devices && typeof field.devices === 'object') {
        Object.keys(field.devices).forEach(deviceId => {
            if (deviceId.startsWith('device_') && !devices[deviceId]) {
                devices[deviceId] = {
                    id: deviceId,
                    name: field.devices[deviceId].name || `Device ${deviceId.replace('device_', '')}`
                };
            }
        });
    }
    const legacyDeviceId = field['deviceToken(microController)'] || field.deviceToken || field.esp32Token;
    if (legacyDeviceId && !devices[legacyDeviceId]) {
        devices[legacyDeviceId] = { id: legacyDeviceId, name: legacyDeviceId };
    }
    if (Object.keys(devices).length === 0) {
        devices.device_1 = { id: 'device_1', name: 'Device 1' };
    }
    return devices;
}

function getActiveDeviceId() {
    const activeField = appState.fields && appState.fields[appState.activeFieldId];
    if (!activeField) return '';
    const devices = normalizeFieldDevices(activeField);
    const preferredId = activeField.activeDeviceId || activeField['deviceToken(microController)'] || activeField.deviceToken || activeField.esp32Token;
    if (preferredId && devices[preferredId]) return preferredId;
    return Object.keys(devices)[0] || '';
}

function getNextDeviceId(field) {
    const devices = normalizeFieldDevices(field);
    const numbers = Object.keys(devices).map(id => {
        const match = id.match(/^device_(\d+)$/);
        return match ? Number(match[1]) : 0;
    });
    return `device_${Math.max(0, ...numbers) + 1}`;
}

function createDefaultSensorData() {
    return {
        sensors: {
            humidity: 45,
            moisture: 30,
            ph: 6.5,
            tds: 450,
            temp: 24
        },
        pump: {
            status: 'off',
            active: false,
            lastSwitched: firebase.database.ServerValue.TIMESTAMP
        },
        usage: {
            waterUsed: 0,
            energyUsed: 0
        }
    };
}

function toPascalCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function createDefaultSensors() {
    return sensorConfigs.reduce((state, sensor) => {
        state[sensor.key] = { val: null, trend: 'stable', history: [] };
        return state;
    }, {});
}

function getSensorIdealRange(sensorName, crop) {
    const config = sensorConfigByKey[sensorName];
    if (!config) return null;
    return config.idealRange || crop[config.idealRangeKey] || [0, 0];
}

function getCurrentCropConfig() {
    const defaultCrop = appConfig.crops[appState.crop] || appConfig.crops.other;
    const override = appState.cropOverrides && appState.crop ? appState.cropOverrides[appState.crop] : null;
    return {
        ...defaultCrop,
        ...(override || {}),
        irrigationRules: {
            ...defaultCrop.irrigationRules,
            ...((override && override.irrigationRules) || {})
        }
    };
}

function userDataPath(relativePath) {
    const cleanPath = relativePath.replace(/^\/+/, '');
    if (!appState.userId) return cleanPath;
    
    // User-level non-field specific nodes
    if (cleanPath.startsWith('fields') || cleanPath.startsWith('anon_') || cleanPath.startsWith('user')) {
        return `users/${appState.userId}/${cleanPath}`;
    }
    
    // Field-specific nodes (sensors, pump, usage, etc.)
    if (appState.activeFieldId) {
        const deviceId = getActiveDeviceId();
        if (deviceId) {
            return `users/${appState.userId}/fields/${appState.activeFieldId}/devices/${deviceId}/sensorData/${cleanPath}`;
        }
    }
    
    return `users/${appState.userId}/${cleanPath}`;
}

// ==========================================
// FIREBASE AUTHENTICATION
// ==========================================

// Email/Password Login
function emailLogin(email, password) {
    if (!auth) {
        alert('Bhoomi Bytes Authentication system not initialized');
        return;
    }
    markLoginRequested();
    setAuthStatus('Signing in with email...');
    auth.signInWithEmailAndPassword(email.trim(), password)
        .catch((error) => {
            clearAuthSession();
            setAuthStatus('Login failed: ' + error.message, 'error');
            console.error('Email login failed:', error);
        });
}

// Email/Password Signup
function emailSignup(name, email, password) {
    if (!auth) {
        alert('Bhoomi Bytes Authentication system not initialized');
        return;
    }
    const displayName = name.trim();
    pendingDisplayName = displayName;
    markLoginRequested();
    setAuthStatus('Creating your account...');
    auth.createUserWithEmailAndPassword(email.trim(), password)
        .then((userCredential) => {
            return userCredential.user.updateProfile({ displayName });
        })
        .then(() => {
            if (auth.currentUser && appState.userId === auth.currentUser.uid) {
                appState.user = displayName;
                saveAppState();
            }
            pendingDisplayName = null;
        })
        .catch((error) => {
            clearAuthSession();
            pendingDisplayName = null;
            setAuthStatus(`Signup failed: ${error.message}`, 'error');
            alert('Signup failed: ' + error.message);
        });
}

function sendPasswordReset(email) {
    if (!auth) {
        alert('Bhoomi Bytes Authentication system not initialized');
        return;
    }

    const resetEmail = email.trim();
    if (!resetEmail) {
        setAuthStatus('Enter your email first, then tap Forgot password.', 'error');
        const loginEmail = document.getElementById('loginEmail');
        if (loginEmail) loginEmail.focus();
        return;
    }

    setAuthStatus('Sending password reset email...');
    auth.sendPasswordResetEmail(resetEmail)
        .then(() => {
            setAuthStatus('Password reset email sent. Check your inbox.');
        })
        .catch((error) => {
            setAuthStatus(`Reset failed: ${error.message}`, 'error');
            alert('Password reset failed: ' + error.message);
        });
}

// Guest Login (Anonymous)
function guestLogin() {
    if (!auth) {
        alert('Bhoomi Bytes Authentication system not initialized');
        return;
    }

    setGuestLoginLoading(true);
    markLoginRequested();
    auth.signInAnonymously()
        .catch((error) => {
            clearAuthSession();
            setGuestLoginLoading(false);
            if (guestAuthStatus) {
                guestAuthStatus.innerText = 'Login failed: ' + error.message;
                guestAuthStatus.className = 'auth-status error';
            }
            console.error('Guest anonymous login failed:', error);
        });
}

function googleLogin() {
    if (!auth || typeof firebase === 'undefined') {
        alert('Bhoomi Bytes Authentication system not initialized');
        return;
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({ prompt: 'select_account' });

    setAuthStatus('Connecting with Google...');
    setProviderButtonsLoading(true);
    markLoginRequested();

    auth.signInWithPopup(provider)
        .catch((error) => {
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                setAuthStatus('Popup was blocked. Redirecting to Google...');
                return auth.signInWithRedirect(provider);
            }
            clearAuthSession();
            setAuthStatus('Google login failed: ' + error.message, 'error');
            console.error('Google login failed:', error);
        })
        .finally(() => {
            setProviderButtonsLoading(false);
        });
}

// Logout
function logout(options = {}) {
    if (!auth) return;
    clearAuthSession();
    auth.signOut().then(() => {
        appState = createDefaultAppState();
        if (options.reason === 'timeout') {
            alert('You were logged out automatically after 10 minutes.');
        }
        location.reload();
    });
}

// ==========================================

let activeListeners = [];

function detachFirebaseListeners() {
    activeListeners.forEach(ref => {
        try {
            ref.off();
        } catch (e) {
            console.warn("Failed to detach reference listener", e);
        }
    });
    activeListeners = [];
    firebaseListenersStarted = false;
}

// Read sensor data from Firebase
function readFirebaseSensor(sensorName) {
    if (!db) return;
    const sensorConfig = sensorConfigByKey[sensorName];
    if (!sensorConfig) return;

    const ref = db.ref(userDataPath(sensorConfig.firebasePath));
    ref.on('value', (snapshot) => {
        const val = snapshot.val();
        const crop = getCurrentCropConfig();
        const idealRange = getSensorIdealRange(sensorName, crop);

        if (val === null || val === undefined || val === '') {
            resetSensorUI(sensorName);
            runAILogic(crop);
            return;
        }

        const numericVal = Number(val);
        if (Number.isNaN(numericVal)) {
            resetSensorUI(sensorName);
            runAILogic(crop);
            return;
        }

        sensors[sensorName].val = numericVal;
        updateSensorUI(sensorName, numericVal, idealRange, sensorConfig.decimals);
        runAILogic(crop);
    });
    activeListeners.push(ref);
}

// Write desired pump state to Firebase
function sendPumpCommand(action) {
    if (!db) {
        console.error('Firebase not initialized');
        return;
    }
    const turnOn = action === 'start';
    db.ref(userDataPath('pump/active')).set(turnOn).then(() => {
        showFarmAlert(`Pump ${action === 'start' ? 'start' : 'stop'} request sent.`, 'success', 'fa-circle-check');
    }).catch((err) => {
        showFarmAlert(`Pump update failed: ${err.message}`, 'danger', 'fa-circle-exclamation');
    });
}

// Listen to pump status from Firebase
function listenPumpStatus() {
    if (!db) return;
    const ref = db.ref(userDataPath('pump/status'));
    ref.on('value', (snapshot) => {
        const status = snapshot.val();
        if (status === 'on') {
            appState.pumpActive = true;
        } else if (status === 'off') {
            appState.pumpActive = false;
        }
        updatePumpUI(status);
    });
    activeListeners.push(ref);
}

function listenFarmUsage() {
    if (!db) return;

    const ref1 = db.ref(userDataPath('usage/waterUsed'));
    ref1.on('value', (snapshot) => {
        const value = Number(snapshot.val());
        appState.waterUsed = Number.isNaN(value) ? null : value;
        updateUsageSummary();
    });
    activeListeners.push(ref1);

    const ref2 = db.ref(userDataPath('usage/energyUsed'));
    ref2.on('value', (snapshot) => {
        const value = Number(snapshot.val());
        appState.energyUsed = Number.isNaN(value) ? null : value;
        updateUsageSummary();
    });
    activeListeners.push(ref2);
}

// APP STATE
// ==========================================
// App State
const APP_STATE_PREFIX = 'nexus_agri_state';
const LOGIN_REQUESTED_KEY = 'nexus_login_requested';
const AUTH_EXPIRES_AT_KEY = 'nexus_auth_expires_at';
const AUTH_SESSION_MS = 10 * 60 * 1000;
const ANON_DELETE_PREFIX = 'nexus_anon_delete_at_';
const ANON_DELETE_MS = 10 * 60 * 1000;

let autoLogoutTimer = null;
let anonDeleteTimer = null;
let anonDeleteExpiresAt = null;

function createDefaultAppState() {
    return {
        user: null,
        fieldSize: null,
        unit: null,
        crop: null,
        lang: 'en',
        pumpActive: false,
        waterUsed: null,
        energyUsed: null,
        userId: null,
        isGuest: false,
        cropOverrides: {},
        fields: {},
        activeFieldId: null,
        activeSection: 'home',
        weatherLocation: null,
        pumpTimerEndsAt: null
    };
}

function getAppStateKey(userId = appState.userId) {
    return userId ? `${APP_STATE_PREFIX}_${userId}` : APP_STATE_PREFIX;
}

function markLoginRequested() {
    sessionStorage.setItem(LOGIN_REQUESTED_KEY, 'true');
    refreshAuthSession();
}

function refreshAuthSession() {
    sessionStorage.setItem(AUTH_EXPIRES_AT_KEY, String(Date.now() + AUTH_SESSION_MS));
}

function clearAuthSession() {
    sessionStorage.removeItem(LOGIN_REQUESTED_KEY);
    sessionStorage.removeItem(AUTH_EXPIRES_AT_KEY);
    stopAutoLogoutTimer();
    stopAnonymousDeletionTimer();
}

function hasActiveAuthSession() {
    const expiresAt = Number(sessionStorage.getItem(AUTH_EXPIRES_AT_KEY));
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function stopAutoLogoutTimer() {
    if (autoLogoutTimer) {
        clearTimeout(autoLogoutTimer);
        autoLogoutTimer = null;
    }
}

function stopAnonymousDeletionTimer() {
    if (anonDeleteTimer) {
        clearInterval(anonDeleteTimer);
        anonDeleteTimer = null;
    }
    anonDeleteExpiresAt = null;
    if (anonTimerDisplay) {
        anonTimerDisplay.style.display = 'none';
    }
}

function startAutoLogoutTimer() {
    stopAutoLogoutTimer();
    refreshAuthSession();
    autoLogoutTimer = setTimeout(() => {
        showFarmAlert('Session expired after 10 minutes. Logging out for safety.', 'warn', 'fa-clock');
        logout({ reason: 'timeout' });
    }, AUTH_SESSION_MS);
}

function getAnonDeleteKey(userId) {
    return `${ANON_DELETE_PREFIX}${userId}`;
}

function startAnonymousDeletionTimer(user, isFreshLogin = false) {
    if (!user || !user.isAnonymous) {
        stopAnonymousDeletionTimer();
        return;
    }

    // Clean up any existing timer interval first
    if (anonDeleteTimer) {
        clearInterval(anonDeleteTimer);
        anonDeleteTimer = null;
    }

    const now = Date.now();
    const key = getAnonDeleteKey(user.uid);
    let expiresAt = Number(localStorage.getItem(key));

    if (isFreshLogin || !Number.isFinite(expiresAt) || expiresAt <= now) {
        expiresAt = now + ANON_DELETE_MS;
        localStorage.setItem(key, String(expiresAt));
        console.log(`[Guest Timer] Reset timer for anonymous user ${user.uid} to expire in 10 minutes.`);
    }

    anonDeleteExpiresAt = expiresAt;
    if (anonTimerDisplay) {
        anonTimerDisplay.style.display = 'block';
    }
    updateAnonymousTimerDisplay();
    anonDeleteTimer = setInterval(updateAnonymousTimerDisplay, 1000);
}

function updateAnonymousTimerDisplay() {
    const isGuest = auth && auth.currentUser && auth.currentUser.isAnonymous;

    // Toggle settings timer display
    if (settingsAnonTimerDisplay) {
        if (isGuest && anonDeleteExpiresAt) {
            settingsAnonTimerDisplay.style.display = 'block';
        } else {
            settingsAnonTimerDisplay.style.display = 'none';
        }
    }

    if (!anonDeleteExpiresAt) return;

    const remaining = anonDeleteExpiresAt - Date.now();
    if (remaining <= 0) {
        if (anonTimerDisplay) {
            anonTimerDisplay.innerText = 'Guest account expires now.';
        }
        if (settingsAnonTimerDisplay) {
            settingsAnonTimerDisplay.innerText = 'Guest account expires now.';
        }
        handleAnonymousExpiration();
        return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (anonTimerDisplay) {
        anonTimerDisplay.innerText = `Guest account expires in ${timeString}`;
    }

    if (settingsAnonTimerDisplay) {
        const lang = (appState && appState.lang) ? appState.lang : 'en';
        const translation = getTranslation(lang, 'label_guest_timer_desc') || 
            `Guest account expires in {time}. After 10 minutes, the account will be automatically deleted.`;
        settingsAnonTimerDisplay.innerText = translation.replace('{time}', timeString);
    }
}

function refreshDynamicTranslations(lang) {
    updateAnonymousTimerDisplay();
}

function handleAnonymousExpiration() {
    stopAnonymousDeletionTimer();

    if (!auth || !auth.currentUser || !auth.currentUser.isAnonymous) return;
    const user = auth.currentUser;
    localStorage.removeItem(getAnonDeleteKey(user.uid));
    deleteAnonymousAccount(user, true);
}

function deleteAnonymousAccount(user, isAuto = false) {
    if (!user) return;

    const userStateKey = getAppStateKey(user.uid);
    const cleanup = () => {
        localStorage.removeItem(userStateKey);
        localStorage.removeItem(getAnonDeleteKey(user.uid));
        clearAuthSession();
        appState = createDefaultAppState();
        if (isAuto) {
            showLoginView();
        } else {
            location.reload();
        }
    };

    const deleteAuthUser = () => {
        user.delete()
            .then(cleanup)
            .catch((error) => {
                if (isAuto) {
                    cleanup();
                } else {
                    if (deleteAccountBtn) deleteAccountBtn.disabled = false;
                    showFarmAlert(`Account delete failed: ${error.message}`, 'danger', 'fa-circle-exclamation');
                }
            });
    };

    const performDelete = () => {
        if (!db) {
            deleteAuthUser();
            return;
        }

        db.ref(`users/${user.uid}`).remove()
            .then(deleteAuthUser)
            .catch((error) => {
                if (isAuto) {
                    deleteAuthUser();
                } else {
                    if (deleteAccountBtn) deleteAccountBtn.disabled = false;
                    showFarmAlert(`Account data delete failed: ${error.message}`, 'danger', 'fa-circle-exclamation');
                }
            });
    };

    // If it is an automatic reload delete, wait 300ms to ensure database auth state is fully synchronized
    if (isAuto) {
        setTimeout(performDelete, 300);
    } else {
        performDelete();
    }
}

function handleUserActivity() {
    if (!auth || !auth.currentUser) return;
    startAutoLogoutTimer();
}

['click', 'keydown', 'mousemove', 'touchstart'].forEach((eventName) => {
    document.addEventListener(eventName, handleUserActivity, { passive: true });
});

function loadAppStateForUser(user) {
    const saved = localStorage.getItem(getAppStateKey(user.uid));
    if (!saved) return createDefaultAppState();

    try {
        return { ...createDefaultAppState(), ...JSON.parse(saved) };
    } catch (error) {
        console.warn('Saved app state is invalid. Starting fresh.', error);
        return createDefaultAppState();
    }
}

function saveAppState() {
    if (!appState.userId) return;
    localStorage.setItem(getAppStateKey(), JSON.stringify(appState));
}

let appState = createDefaultAppState();

// Sensor State
let sensors = createDefaultSensors();
let sensorStatusKeys = {};
let currentAiRecKey = 'ai_rec_normal';

let charts = {};
let liveSensorChart = null;
let chartsInitialized = false;
let dashboardTimer = null;
let weatherIntervalId = null;
let firebaseListenersStarted = false;
let pendingDisplayName = null;
let pumpTimerInterval = null;
let currentWeatherState = {
    temp: null,
    rain: null,
    wind: null,
    humid: null,
    desc: null,
    code: null
};

// DOM Elements
const loginView = document.getElementById('login-view');
const mainHeader = document.getElementById('mainHeader');
const onboardingView = document.getElementById('onboarding-view');
const dashboardView = document.getElementById('dashboard-view');
const onboardingForm = document.getElementById('onboardingForm');
const langSelect = document.getElementById('languageSelect');
const resetBtn = document.getElementById('resetAppBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Login Form Elements
const emailTabBtn = document.getElementById('emailTabBtn');
const guestTabBtn = document.getElementById('guestTabBtn');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const guestLoginBtn = document.getElementById('guestLoginBtn');
const guestAuthStatus = document.getElementById('guestAuthStatus');
const authStatus = document.getElementById('authStatus');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const toggleSignUp = document.getElementById('toggleSignUp');
const toggleLogin = document.getElementById('toggleLogin');
const cropSettingsForm = document.getElementById('cropSettingsForm');
const resetCropDefaultsBtn = document.getElementById('resetCropDefaultsBtn');
const dispFirebaseUid = document.getElementById('dispFirebaseUid');
const farmSettingsBtn = document.getElementById('farmSettingsBtn');
const farmSettingsModal = document.getElementById('farmSettingsModal');
const farmSettingsForm = document.getElementById('farmSettingsForm');
const farmSettingsCancelBtn = document.getElementById('farmSettingsCancelBtn');
const settingsName = document.getElementById('settingsName');
const settingsFieldName = document.getElementById('settingsFieldName');
const settingsFieldSize = document.getElementById('settingsFieldSize');
const settingsFieldUnit = document.getElementById('settingsFieldUnit');
const settingsCropType = document.getElementById('settingsCropType');
const settingsDeviceSelect = document.getElementById('settingsDeviceSelect');
const settingsAddDeviceBtn = document.getElementById('settingsAddDeviceBtn');
const settingsFieldEsp32TokenDisplay = document.getElementById('settingsFieldEsp32TokenDisplay');
const settingsActiveFieldId = document.getElementById('settingsActiveFieldId');
const anonTimerDisplay = document.getElementById('anonTimerDisplay');
const settingsAnonTimerDisplay = document.getElementById('settingsAnonTimerDisplay');
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const bottomNav = document.getElementById('bottomNav');
const weatherEditBtn = document.getElementById('weatherEditBtn');
const weatherAutoBtn = document.getElementById('weatherAutoBtn');
const weatherSearchForm = document.getElementById('weatherSearchForm');
const weatherLocationInput = document.getElementById('weatherLocationInput');
const weatherSearchStatus = document.getElementById('weatherSearchStatus');
const btnSetPumpTimer = document.getElementById('btnSetPumpTimer');
const btnCancelPumpTimer = document.getElementById('btnCancelPumpTimer');
const pumpTimerMinutes = document.getElementById('pumpTimerMinutes');
const pumpTimerStatus = document.getElementById('pumpTimerStatus');

// Add Field Modal & Dropdown Switcher
const addFieldModal = document.getElementById('addFieldModal');
const addFieldForm = document.getElementById('addFieldForm');
const btnAddFieldBtn = document.getElementById('btnAddFieldBtn');
const btnAddFieldCancel = document.getElementById('btnAddFieldCancel');
const fieldSelect = document.getElementById('fieldSelect');
const fieldSelectorContainer = document.getElementById('fieldSelectorContainer');

function renderLanguageOptions() {
    if (!langSelect) return;

    langSelect.innerHTML = '';
    appConfig.languages.forEach((language) => {
        const option = document.createElement('option');
        option.value = language.code;
        option.textContent = language.label;
        langSelect.appendChild(option);
    });
}

function renderSensorCards() {
    const sensorCards = document.querySelector('.sensor-cards');
    if (!sensorCards) return;

    sensorCards.innerHTML = '';
    sensorConfigs.forEach((sensor) => {
        const sensorName = toPascalCase(sensor.key);
        const card = document.createElement('div');
        card.className = 'sensor-card';
        card.id = `card${sensorName}`;
        card.innerHTML = `
            <div class="sensor-header">
                <span data-i18n="${sensor.labelKey}">${sensor.fallbackLabel}</span>
                <i class="fa-solid ${sensor.icon}"></i>
            </div>
            <div class="sensor-value">
                <span id="val${sensorName}">--</span><span class="unit">${sensor.unit}</span>
            </div>
            <div class="sensor-status">
                <span class="trend stable"><i class="fa-solid fa-minus"></i></span>
                <span class="interp" id="interp${sensorName}">Normal</span>
            </div>
            <div class="chart-container mini"><canvas id="${sensor.chartCanvasId}"></canvas></div>
        `;
        sensorCards.appendChild(card);
    });
}

function renderConfigDrivenUI() {
    renderLanguageOptions();
    renderSensorCards();
}

function getCropDisplayName(cropKey = appState.crop) {
    const crop = appConfig.crops[cropKey] || appConfig.crops.other;
    const translated = getTranslation(appState.lang, `crop_${cropKey}`);
    if (translated && translated !== `crop_${cropKey}`) return translated;
    return crop.name || toPascalCase(cropKey || 'crop');
}

function applyCropTheme() {
    const theme = appState.crop || 'paddy';
    document.body.dataset.cropTheme = theme;
    const chip = document.getElementById('activeCropChip');
    if (chip) chip.innerText = getCropDisplayName(theme);
}

function setActiveSection(section = 'home') {
    appState.activeSection = section;
    document.querySelectorAll('.dashboard-section').forEach((panel) => {
        panel.classList.toggle('section-active', panel.dataset.section === section);
    });
    document.querySelectorAll('.bottom-nav-item').forEach((button) => {
        button.classList.toggle('active', button.dataset.targetSection === section);
    });
    saveAppState();
    
    // Force Chart.js to resize when sections switch to avoid 0-width rendering bugs
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        if (liveSensorChart) {
            try { liveSensorChart.resize(); } catch (e) { console.warn(e); }
        }
        if (charts) {
            Object.keys(charts).forEach(key => {
                if (charts[key]) {
                    try { charts[key].resize(); } catch (e) { console.warn(e); }
                }
            });
        }
    }, 50);
}

function setupBottomNavigation() {
    if (!bottomNav) return;
    bottomNav.addEventListener('click', (event) => {
        const button = event.target.closest('.bottom-nav-item');
        if (!button) return;
        setActiveSection(button.dataset.targetSection || 'home');
    });
}

function setText(id, text) {
    const element = document.getElementById(id);
    if (element) element.innerText = text;
}

function updateFirebaseUidDisplay() {
    if (dispFirebaseUid) dispFirebaseUid.innerText = getActiveDeviceId() || '--';
}

function renderDeviceSettings(activeField) {
    const devices = normalizeFieldDevices(activeField);
    const activeDeviceId = getActiveDeviceId();

    if (settingsDeviceSelect) {
        settingsDeviceSelect.innerHTML = '';
        Object.keys(devices).forEach(deviceId => {
            const opt = document.createElement('option');
            opt.value = deviceId;
            opt.innerText = devices[deviceId].name || deviceId;
            settingsDeviceSelect.appendChild(opt);
        });
        settingsDeviceSelect.value = activeDeviceId;
    }

    if (settingsFieldEsp32TokenDisplay) {
        settingsFieldEsp32TokenDisplay.innerText = activeDeviceId || '--';
    }
}

function updateFarmSummaryUI() {
    if (appState.user) {
        setText('dispName', appState.user);
    }

    if (appState.fieldSize && appState.unit) {
        setText('dispSize', `${appState.fieldSize} ${getTranslation(appState.lang, 'unit_' + appState.unit)}`);
    }

    if (appState.crop) {
        const cropNameKey = `crop_${appState.crop}`;
        const cropElement = document.getElementById('dispCrop');
        if (cropElement) {
            cropElement.setAttribute('data-i18n', cropNameKey);
            cropElement.innerText = getCropDisplayName(appState.crop);
        }
    }

    updateFirebaseUidDisplay();
    applyCropTheme();
}

function openFarmSettings() {
    if (!farmSettingsModal) return;

    if (settingsName) settingsName.value = appState.user || '';
    if (settingsFieldSize) settingsFieldSize.value = appState.fieldSize || '';
    if (settingsFieldUnit) settingsFieldUnit.value = appState.unit || 'bigha';
    if (settingsCropType) settingsCropType.value = appState.crop || 'rice';
    
    const activeField = appState.fields && appState.fields[appState.activeFieldId];
    
    // Field details mapping
    if (settingsFieldName && activeField) {
        settingsFieldName.value = activeField.name || '';
    } else if (settingsFieldName) {
        settingsFieldName.value = 'Main Field';
    }
    
    renderDeviceSettings(activeField);
    
    if (settingsActiveFieldId) {
        settingsActiveFieldId.innerText = appState.activeFieldId || '--';
    }
    
    updateFirebaseUidDisplay();
    farmSettingsModal.classList.add('active');
}

function closeFarmSettings() {
    if (farmSettingsModal) farmSettingsModal.classList.remove('active');
}

function setupFarmSettings() {
    if (farmSettingsBtn) {
        farmSettingsBtn.addEventListener('click', openFarmSettings);
    }

    if (farmSettingsCancelBtn) {
        farmSettingsCancelBtn.addEventListener('click', closeFarmSettings);
    }

    if (farmSettingsModal) {
        farmSettingsModal.addEventListener('click', (event) => {
            if (event.target === farmSettingsModal) closeFarmSettings();
        });
    }

    if (settingsDeviceSelect) {
        settingsDeviceSelect.addEventListener('change', () => {
            const activeField = appState.fields && appState.fields[appState.activeFieldId];
            if (!activeField) return;
            activeField.activeDeviceId = settingsDeviceSelect.value;
            activeField['deviceToken(microController)'] = settingsDeviceSelect.value;
            renderDeviceSettings(activeField);
            updateFirebaseUidDisplay();
        });
    }

    if (settingsAddDeviceBtn) {
        settingsAddDeviceBtn.addEventListener('click', () => {
            const activeField = appState.fields && appState.fields[appState.activeFieldId];
            if (!activeField || !db || !appState.userId || !appState.activeFieldId) return;

            const deviceId = getNextDeviceId(activeField);
            const devices = normalizeFieldDevices(activeField);
            devices[deviceId] = { id: deviceId, name: `Device ${deviceId.replace('device_', '')}` };
            activeField.deviceRegistry = devices;
            activeField.activeDeviceId = deviceId;
            activeField['deviceToken(microController)'] = deviceId;

            db.ref(`users/${appState.userId}/fields/${appState.activeFieldId}`).update({
                deviceRegistry: devices,
                activeDeviceId: deviceId,
                'deviceToken(microController)': deviceId
            });
            db.ref(`users/${appState.userId}/fields/${appState.activeFieldId}/devices/${deviceId}/sensorData`).set(createDefaultSensorData());

            renderDeviceSettings(activeField);
            updateFarmSummaryUI();
            showFarmAlert(`Added ${deviceId}.`, 'success', 'fa-circle-check');
        });
    }

    if (farmSettingsForm) {
        farmSettingsForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const farmerName = settingsName.value.trim();
            const fieldSize = Number(settingsFieldSize.value);
            const activeFieldName = settingsFieldName ? settingsFieldName.value.trim() : 'Main Field';

            if (!farmerName) {
                showFarmAlert('Please enter a farmer name.', 'warn', 'fa-triangle-exclamation');
                return;
            }

            if (!Number.isFinite(fieldSize) || fieldSize <= 0) {
                showFarmAlert('Please enter a valid field size.', 'warn', 'fa-triangle-exclamation');
                return;
            }

            const activeField = appState.fields && appState.fields[appState.activeFieldId];
            const devices = normalizeFieldDevices(activeField);
            const deviceId = (settingsDeviceSelect && settingsDeviceSelect.value) || getActiveDeviceId() || 'device_1';

            appState.user = farmerName;
            appState.fieldSize = fieldSize;
            appState.unit = settingsFieldUnit.value;
            appState.crop = settingsCropType.value;

            if (appState.fields && appState.fields[appState.activeFieldId]) {
                appState.fields[appState.activeFieldId].deviceRegistry = devices;
                appState.fields[appState.activeFieldId].activeDeviceId = deviceId;
                appState.fields[appState.activeFieldId]['deviceToken(microController)'] = deviceId;
            }
            if (db && appState.userId) {
                db.ref(`users/${appState.userId}/profile`).update({
                    name: farmerName,
                    lastActive: firebase.database.ServerValue.TIMESTAMP
                }).catch(err => {
                    console.warn("Failed to update profile name in DB:", err);
                });
            }

            // Write back updated field specific details to Firebase
            if (db && appState.activeFieldId) {

                const updatedField = {
                    id: appState.activeFieldId,
                    name: activeFieldName || 'Main Field',
                    crop: appState.crop,
                    fieldSize: appState.fieldSize,
                    unit: appState.unit,
                    deviceRegistry: devices,
                    activeDeviceId: deviceId,
                    'deviceToken(microController)': deviceId
                };
                
                detachFirebaseListeners();
                
                db.ref(`users/${appState.userId}/fields/${appState.activeFieldId}`).update(updatedField);
            }

            saveAppState();
            updateFarmSummaryUI();
            loadCropSettingsForm();
            runAILogic(getCurrentCropConfig());
            closeFarmSettings();
            showFarmAlert('Farm settings updated.', 'success', 'fa-circle-check');
        });
    }

    // Delete Field Event Listeners
    const deleteFieldBtn = document.getElementById('deleteFieldBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const confirmationModal = document.getElementById('confirmationModal');

    if (deleteFieldBtn) {
        deleteFieldBtn.addEventListener('click', () => {
            const activeFieldId = appState.activeFieldId;
            if (!activeFieldId || !appState.fields || !appState.fields[activeFieldId]) return;

            const activeField = appState.fields[activeFieldId];
            
            // Show custom confirmation modal
            const confirmModalBody = document.getElementById('confirmModalBody');
            if (confirmationModal && confirmModalBody) {
                confirmModalBody.innerText = `Are you sure you want to delete the field "${activeField.name || 'Main Field'}"? This will permanently delete all its sensor values and control history from the database.`;
                confirmationModal.classList.add('active');
            }
        });
    }

    if (confirmCancelBtn && confirmationModal) {
        confirmCancelBtn.addEventListener('click', () => {
            confirmationModal.classList.remove('active');
        });
    }

    if (confirmationModal) {
        confirmationModal.addEventListener('click', (event) => {
            if (event.target === confirmationModal) {
                confirmationModal.classList.remove('active');
            }
        });
    }

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            const activeFieldId = appState.activeFieldId;
            if (!activeFieldId || !appState.fields || !appState.fields[activeFieldId]) {
                if (confirmationModal) confirmationModal.classList.remove('active');
                return;
            }

            // Disable button during delete
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerText = 'Deleting...';

            const cleanupAndClose = () => {
                // Remove field from local state
                if (appState.fields) {
                    delete appState.fields[activeFieldId];
                }
                
                // Select next available field, or reset if none left
                const remainingFieldIds = Object.keys(appState.fields || {});
                if (remainingFieldIds.length > 0) {
                    appState.activeFieldId = remainingFieldIds[0];
                    const nextField = appState.fields[appState.activeFieldId];
                    appState.crop = nextField.crop;
                    appState.fieldSize = nextField.fieldSize;
                    appState.unit = nextField.unit;
                } else {
                    appState.activeFieldId = null;
                    appState.crop = null;
                    appState.fieldSize = null;
                    appState.unit = null;
                }

                saveAppState();
                
                // Re-enable and reset confirm button
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.innerText = 'Delete';
                
                // Close modals
                if (confirmationModal) confirmationModal.classList.remove('active');
                closeFarmSettings();
                
                // Refresh UI
                updateFarmSummaryUI();
                loadCropSettingsForm();
                
                if (appState.activeFieldId) {
                    switchField(appState.activeFieldId);
                    showFarmAlert('Field deleted successfully.', 'success', 'fa-circle-check');
                } else {
                    detachFirebaseListeners();
                    showDashboard(); // Will show onboarding since crop is null
                    showFarmAlert('All fields deleted. Please configure a new farm.', 'info', 'fa-mountain-sun');
                }
            };

            if (db) {
                db.ref(`users/${appState.userId}/fields/${activeFieldId}`).remove()
                    .then(() => {
                        cleanupAndClose();
                    })
                    .catch((err) => {
                        confirmDeleteBtn.disabled = false;
                        confirmDeleteBtn.innerText = 'Delete';
                        showFarmAlert(`Failed to delete field from database: ${err.message}`, 'danger', 'fa-circle-exclamation');
                    });
            } else {
                cleanupAndClose();
            }
        });
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', deleteAccount);
    }
}

function setAccountDangerButtonsLoading(isLoading, activeButton, loadingText) {
    if (deleteAccountBtn) deleteAccountBtn.disabled = isLoading;

    if (activeButton) {
        activeButton.innerText = isLoading ? loadingText : getTranslation(appState.lang, 'btn_delete_account');
    }
}

function deleteAccount() {
    if (!auth || !auth.currentUser || !appState.userId) {
        showFarmAlert('Sign in before deleting your account.', 'warn', 'fa-triangle-exclamation');
        return;
    }

    const confirmed = window.confirm('Delete this account permanently?\n\nThis will remove your farm setup, all sensor history, pump data, and usage records. This cannot be undone.');
    if (!confirmed) return;

    setAccountDangerButtonsLoading(true, deleteAccountBtn, 'Deleting...');

    const user = auth.currentUser;
    const userStateKey = getAppStateKey(appState.userId);

    const cleanupAndReload = () => {
        localStorage.removeItem(userStateKey);
        clearAuthSession();
        appState = createDefaultAppState();
        location.reload();
    };

    const deleteAuthUser = () => {
        return user.delete();
    };

    const performDeletion = () => {
        if (!db) {
            return deleteAuthUser();
        }

        // 1. Send reset command to all devices
        const updates = {};
        if (appState.fields) {
            Object.keys(appState.fields).forEach(fieldId => {
                const field = appState.fields[fieldId];
                const devices = field.deviceRegistry || {};
                Object.keys(devices).forEach(deviceId => {
                    updates[`users/${appState.userId}/fields/${fieldId}/devices/${deviceId}/sensorData/device/reset`] = true;
                });
            });
        }

        let initialPromise = Promise.resolve();
        if (Object.keys(updates).length > 0) {
            setAccountDangerButtonsLoading(true, deleteAccountBtn, 'Signaling devices...');
            initialPromise = db.ref().update(updates).then(() => {
                return new Promise(resolve => setTimeout(resolve, 5000)); // Give ESP32 time to receive
            }).catch(err => {
                console.warn("Failed to signal ESP32 devices:", err);
            });
        }

        return initialPromise
            .then(() => {
                setAccountDangerButtonsLoading(true, deleteAccountBtn, 'Deleting...');
                return db.ref(`users/${appState.userId}`).remove();
            })
            .then(() => deleteAuthUser());
    };

    const handleDeletionSuccess = () => {
        cleanupAndReload();
    };

    const handleDeletionError = (err) => {
        if (err.code === 'auth/requires-recent-login') {
            reauthAndDelete();
        } else {
            setAccountDangerButtonsLoading(false, deleteAccountBtn);
            showFarmAlert(`Account delete failed: ${err.message}`, 'danger', 'fa-circle-exclamation');
        }
    };

    const reauthAndDelete = () => {
        const providerData = user.providerData;
        const isGoogle    = providerData && providerData.some(p => p.providerId === 'google.com');
        const isEmail     = providerData && providerData.some(p => p.providerId === 'password');
        const isAnon      = user.isAnonymous;

        if (isAnon) {
            performDeletion().then(handleDeletionSuccess).catch(err => {
                setAccountDangerButtonsLoading(false, deleteAccountBtn);
                showFarmAlert(`Delete failed: ${err.message}`, 'danger', 'fa-circle-exclamation');
            });
            return;
        }

        if (isGoogle) {
            const provider = new firebase.auth.GoogleAuthProvider();
            user.reauthenticateWithPopup(provider)
                .then(() => performDeletion())
                .then(handleDeletionSuccess)
                .catch(err => {
                    setAccountDangerButtonsLoading(false, deleteAccountBtn);
                    showFarmAlert(`Re-authentication failed: ${err.message}`, 'danger', 'fa-circle-exclamation');
                });
            return;
        }

        if (isEmail) {
            const password = window.prompt('Enter your current password to confirm account deletion:');
            if (!password) {
                setAccountDangerButtonsLoading(false, deleteAccountBtn);
                return;
            }
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
            user.reauthenticateWithCredential(credential)
                .then(() => performDeletion())
                .then(handleDeletionSuccess)
                .catch(err => {
                    setAccountDangerButtonsLoading(false, deleteAccountBtn);
                    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                        showFarmAlert('Incorrect password. Account not deleted.', 'danger', 'fa-key');
                    } else {
                        showFarmAlert(`Delete failed: ${err.message}`, 'danger', 'fa-circle-exclamation');
                    }
                });
            return;
        }

        setAccountDangerButtonsLoading(false, deleteAccountBtn);
        showFarmAlert('Please log out, sign back in, then try deleting again.', 'warn', 'fa-key');
    };

    performDeletion().then(handleDeletionSuccess).catch(handleDeletionError);
}

function refreshDynamicTranslations(lang = appState.lang) {
    Object.entries(sensorStatusKeys).forEach(([sensorKey, translationKey]) => {
        const sensorName = toPascalCase(sensorKey);
        setText(`interp${sensorName}`, getTranslation(lang, translationKey));
    });

    setText('aiRecText', getTranslation(lang, currentAiRecKey));

    if (appState.crop) {
        setText('dispCrop', getTranslation(lang, `crop_${appState.crop}`));
    }
}

function getNumberInputValue(id) {
    const input = document.getElementById(id);
    if (!input) return 0;
    const value = Number(input.value);
    return Number.isNaN(value) ? 0 : value;
}

function setNumberInputValue(id, value) {
    const input = document.getElementById(id);
    if (input) input.value = value;
}

function loadCropSettingsForm() {
    if (!cropSettingsForm || !appState.crop) return;

    const crop = getCurrentCropConfig();
    setNumberInputValue('cropMoistureLow', crop.moistureIdeal[0]);
    setNumberInputValue('cropMoistureHigh', crop.moistureIdeal[1]);
    setNumberInputValue('cropTempLow', crop.tempIdeal[0]);
    setNumberInputValue('cropTempHigh', crop.tempIdeal[1]);
    setNumberInputValue('cropPhLow', crop.phIdeal[0]);
    setNumberInputValue('cropPhHigh', crop.phIdeal[1]);
    setNumberInputValue('cropTdsLow', crop.tdsIdeal[0]);
    setNumberInputValue('cropTdsHigh', crop.tdsIdeal[1]);
    setNumberInputValue('cropCriticalMoisture', crop.irrigationRules.criticalMoisture);
    setNumberInputValue('cropStopMoisture', crop.irrigationRules.stopMoisture);
}

function setupCropSettings() {
    if (cropSettingsForm) {
        cropSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!appState.crop) return;

            const moistureLow = getNumberInputValue('cropMoistureLow');
            const moistureHigh = getNumberInputValue('cropMoistureHigh');
            const tempLow = getNumberInputValue('cropTempLow');
            const tempHigh = getNumberInputValue('cropTempHigh');
            const phLow = getNumberInputValue('cropPhLow');
            const phHigh = getNumberInputValue('cropPhHigh');
            const tdsLow = getNumberInputValue('cropTdsLow');
            const tdsHigh = getNumberInputValue('cropTdsHigh');
            const criticalMoisture = getNumberInputValue('cropCriticalMoisture');
            const stopMoisture = getNumberInputValue('cropStopMoisture');

            if (moistureLow > moistureHigh || tempLow > tempHigh || phLow > phHigh || tdsLow > tdsHigh || criticalMoisture > stopMoisture) {
                showFarmAlert('Please keep every low value below its high value before saving.', 'warn', 'fa-triangle-exclamation');
                return;
            }

            appState.cropOverrides = appState.cropOverrides || {};
            appState.cropOverrides[appState.crop] = {
                moistureIdeal: [moistureLow, moistureHigh],
                tempIdeal: [tempLow, tempHigh],
                phIdeal: [phLow, phHigh],
                tdsIdeal: [tdsLow, tdsHigh],
                irrigationRules: {
                    criticalMoisture,
                    stopMoisture
                }
            };

            saveAppState();
            runAILogic(getCurrentCropConfig());
            showFarmAlert('Crop values saved for this farm.', 'success', 'fa-floppy-disk');
        });
    }

    if (resetCropDefaultsBtn) {
        resetCropDefaultsBtn.addEventListener('click', () => {
            if (!appState.crop || !appState.cropOverrides) return;
            delete appState.cropOverrides[appState.crop];
            saveAppState();
            loadCropSettingsForm();
            runAILogic(getCurrentCropConfig());
            showFarmAlert('Crop values reset to the recommended defaults.', 'info', 'fa-rotate-left');
        });
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof loadTranslationFile === 'function') {
        await loadTranslationFile();
    }

    renderConfigDrivenUI();
    initClock();
    setupAuthListener();
    setupLoginEvents();
    setupCropSettings();
    setupFarmSettings();
    setupBottomNavigation();
    setupWeatherControls();
    setupPumpTimerControls();

    // AI recommendation time to time after 30 minutes
    setInterval(() => {
        runAILogic(getCurrentCropConfig());
    }, 30 * 60 * 1000);
});

// Check authentication state
function setupAuthListener() {
    if (!auth) return;
    
    auth.onAuthStateChanged((user) => {
        if (user) {
            const wasRequested = sessionStorage.getItem(LOGIN_REQUESTED_KEY) === 'true';
            
            // Check if page was reloaded
            const isReload = performance.navigation.type === 1 || 
                             (performance.getEntriesByType('navigation')[0] && 
                              performance.getEntriesByType('navigation')[0].type === 'reload');

            if (user.isAnonymous && isReload) {
                console.log("[AuthListener] Guest user reloaded page. Purging guest session.");
                deleteAnonymousAccount(user, true);
                return;
            }

            if (!wasRequested && !hasActiveAuthSession()) {
                console.log("[AuthListener] Stale session or no request detected. Signing out user.");
                auth.signOut();
                showLoginView();
                return;
            }
            sessionStorage.removeItem(LOGIN_REQUESTED_KEY);
            startAutoLogoutTimer();

            localStorage.removeItem(APP_STATE_PREFIX);
            const savedState = loadAppStateForUser(user);
            const authName = pendingDisplayName || user.displayName || user.email || 'Guest User';
            appState = {
                ...savedState,
                userId: user.uid,
                user: savedState.user || authName,
                isGuest: user.isAnonymous
            };
            pendingDisplayName = null;

            if (db) {
                if (user.isAnonymous) {
                    // Set up automatic server-side database cleanup if they close the tab or reload
                    db.ref(`users/${user.uid}`).onDisconnect().remove();
                }

                db.ref(`users/${user.uid}/profile`).update({
                    name: appState.user || authName,
                    email: user.email || 'Guest Account',
                    isGuest: user.isAnonymous,
                    lastActive: firebase.database.ServerValue.TIMESTAMP
                }).catch(err => {
                    console.warn("Failed to update user profile in DB:", err);
                });
            }
            
            langSelect.value = appState.lang;
            applyTranslations(appState.lang);
            updateFirebaseUidDisplay();
            startAnonymousDeletionTimer(user, wasRequested);
            showLoginDone();
            loadFieldsList();
        } else {
            detachFirebaseListeners();
            if (fieldsListenerRef) {
                fieldsListenerRef.off();
                fieldsListenerRef = null;
            }
            clearAuthSession();
            appState = createDefaultAppState();
            updateFirebaseUidDisplay();
            showLoginView();
        }
    });
}

// Show login view
function showLoginView() {
    loginView.classList.add('active');
    mainHeader.style.display = 'none';
    onboardingView.classList.remove('active');
    dashboardView.classList.remove('active');
    document.body.classList.remove('dashboard-ready');
    if (bottomNav) bottomNav.classList.remove('visible');
    setGuestLoginLoading(false);
    setProviderButtonsLoading(false);
    setAuthStatus('');
}

// Login successful
function showLoginDone() {
    loginView.classList.remove('active');
    mainHeader.style.display = 'flex';
    logoutBtn.style.display = 'inline-block';
}

// Setup login form events
function setupLoginEvents() {
    if (emailTabBtn) {
        emailTabBtn.addEventListener('click', () => {
            switchTab('email-tab');
        });
    }
    
    if (guestTabBtn) {
        guestTabBtn.addEventListener('click', () => {
            switchTab('guest-tab');
        });
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            emailLogin(email, password);
        });
    }

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', () => {
            const email = document.getElementById('loginEmail').value;
            sendPasswordReset(email);
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            emailSignup(name, email, password);
        });
    }
    
    if (guestLoginBtn) {
        guestLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            guestLogin();
        });
    }

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            googleLogin();
        });
    }
    
    if (toggleSignUp) {
        toggleSignUp.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        });
    }
    
    if (toggleLogin) {
        toggleLogin.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.style.display = 'none';
            loginForm.style.display = 'block';
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
        });
    }
}

// Switch login tabs
function switchTab(tabName) {
    document.querySelectorAll('.login-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    document.getElementById(tabName.replace('tab', 'TabBtn')).classList.add('active');
    if (tabName !== 'guest-tab') setGuestLoginLoading(false);
}

function setGuestLoginLoading(isLoading) {
    if (!guestLoginBtn) return;

    guestLoginBtn.disabled = isLoading;
    guestLoginBtn.innerHTML = isLoading
        ? '<i class="fa-solid fa-circle-notch fa-spin"></i> Connecting...'
        : '<i class="fa-solid fa-user-check"></i> Continue as Guest';

    if (guestAuthStatus) {
        guestAuthStatus.innerText = isLoading ? 'Connecting anonymously with Firebase...' : '';
    }
}

function setAuthStatus(message, type = 'info') {
    if (!authStatus) return;
    authStatus.innerText = message;
    authStatus.className = `auth-status ${type}`;
}

function setProviderButtonsLoading(isLoading) {
    if (googleLoginBtn) googleLoginBtn.disabled = isLoading;
}
langSelect.addEventListener('change', (e) => {
    appState.lang = e.target.value;
    applyTranslations(appState.lang);
    saveAppState();
    // If forecast is rendered, we might need to re-render it, but basic numbers stay the same
});

onboardingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    appState.user = document.getElementById('opName').value;
    const size = Number(document.getElementById('fieldSize').value);
    const unit = document.getElementById('fieldUnit').value;
    const crop = document.getElementById('cropType').value;
    
    const onboardingDeviceId = 'device_1';

    appState.fieldSize = size;
    appState.unit = unit;
    appState.crop = crop;

    const fieldId = 'field_1';
    appState.activeFieldId = fieldId;

    const newField = {
        id: fieldId,
        name: 'Main Field',
        crop: crop,
        fieldSize: size,
        unit: unit,
        deviceRegistry: {
            [onboardingDeviceId]: { id: onboardingDeviceId, name: 'Device 1' }
        },
        activeDeviceId: onboardingDeviceId,
        'deviceToken(microController)': onboardingDeviceId
    };

    if (db && appState.userId) {
        const defaultSensorData = createDefaultSensorData();

        Promise.all([
            db.ref(`users/${appState.userId}/fields/${fieldId}`).set(newField),
            db.ref(`users/${appState.userId}/fields/${fieldId}/devices/${onboardingDeviceId}/sensorData`).set(defaultSensorData)
        ]).then(() => {
            saveAppState();
            loadFieldsList();
        });
    } else {
        saveAppState();
        showDashboard();
    }
});

resetBtn.addEventListener('click', () => {
    if (db && appState.userId) {
        db.ref(`users/${appState.userId}/fields`).remove().then(() => {
            appState.crop = null;
            appState.fieldSize = null;
            appState.unit = null;
            appState.activeFieldId = null;
            appState.fields = {};
            saveAppState();
            location.reload();
        });
    } else {
        appState.crop = null;
        appState.fieldSize = null;
        appState.unit = null;
        appState.activeFieldId = null;
        appState.fields = {};
        saveAppState();
        location.reload();
    }
});

function showDashboard() {
    if (dashboardTimer) {
        clearTimeout(dashboardTimer);
        dashboardTimer = null;
    }

    onboardingView.classList.remove('active');
    
    // Only show onboarding if user hasn't configured farm yet
    if (!appState.crop) {
        onboardingView.classList.add('active');
        dashboardView.classList.remove('active');
        if (fieldSelectorContainer) fieldSelectorContainer.style.display = 'none';
        document.body.classList.remove('dashboard-ready');
        if (bottomNav) bottomNav.classList.remove('visible');
        return;
    }
    
    dashboardTimer = setTimeout(() => {
        onboardingView.classList.remove('active');
        dashboardView.classList.add('active');
        document.body.classList.add('dashboard-ready');
        if (bottomNav) bottomNav.classList.add('visible');
        dashboardTimer = null;

        if (!chartsInitialized) {
            initCharts();
            chartsInitialized = true;
        }
        
        applyCropTheme();
        setActiveSection(appState.activeSection || 'home');
        updateFarmSummaryUI();
        updateUsageSummary();
        loadCropSettingsForm();
        restorePumpTimer();
        fetchWeather(); // Initial fetch

        // Setup Firebase listeners for sensors and pump
        if (db && !firebaseListenersStarted && appState.activeFieldId) {
            sensorConfigs.forEach(sensor => readFirebaseSensor(sensor.key));
            listenPumpStatus();
            listenFarmUsage();
            firebaseListenersStarted = true;
        }

        if (!weatherIntervalId) {
            weatherIntervalId = setInterval(fetchWeather, 15 * 60 * 1000); // Weather update every 15 mins
        }

    }, 400);
}

// ==========================================
// DYNAMIC MULTI-FIELD SYSTEM MANAGEMENT
// ==========================================
let fieldsListenerRef = null;

function loadFieldsList() {
    if (!db || !appState.userId) {
        showDashboard();
        return;
    }
    
    if (fieldsListenerRef) {
        fieldsListenerRef.off();
    }
    
    fieldsListenerRef = db.ref(`users/${appState.userId}/fields`);
    fieldsListenerRef.on('value', (snapshot) => {
        const fields = snapshot.val() || {};
        appState.fields = fields;
        
        if (Object.keys(fields).length === 0) {
            if (fieldSelectorContainer) fieldSelectorContainer.style.display = 'none';
            appState.crop = null;
            appState.fieldSize = null;
            appState.unit = null;
            appState.activeFieldId = null;
            showDashboard();
            return;
        }
        
        if (fieldSelectorContainer) fieldSelectorContainer.style.display = 'flex';
        if (fieldSelect) {
            fieldSelect.innerHTML = '';
            Object.values(fields).forEach(field => {
                const opt = document.createElement('option');
                opt.value = field.id;
                opt.innerText = `${field.name} (${toPascalCase(field.crop)})`;
                fieldSelect.appendChild(opt);
            });
        }
        
        // Match active field ID
        if (!appState.activeFieldId || !fields[appState.activeFieldId]) {
            appState.activeFieldId = Object.keys(fields)[0];
        }
        
        if (fieldSelect) {
            fieldSelect.value = appState.activeFieldId;
        }
        
        // Sync parameters
        const activeField = fields[appState.activeFieldId];
        appState.crop = activeField.crop;
        appState.fieldSize = activeField.fieldSize;
        appState.unit = activeField.unit;
        
        saveAppState();
        showDashboard();
    });
}

function switchField(fieldId) {
    if (!appState.fields || !appState.fields[fieldId]) return;
    
    detachFirebaseListeners();
    appState.activeFieldId = fieldId;
    
    const activeField = appState.fields[fieldId];
    appState.crop = activeField.crop;
    appState.fieldSize = activeField.fieldSize;
    appState.unit = activeField.unit;
    
    saveAppState();
    
    // Reset charts and sensor readings UI elements
    sensorConfigs.forEach(sensor => resetSensorUI(sensor.key));
    
    // Refresh display
    updateFarmSummaryUI();
    loadCropSettingsForm();
    runAILogic(getCurrentCropConfig());
    applyCropTheme();
    
    // Re-attach listeners on new paths
    if (db) {
        sensorConfigs.forEach(sensor => readFirebaseSensor(sensor.key));
        listenPumpStatus();
        listenFarmUsage();
        firebaseListenersStarted = true;
    }
    
    showFarmAlert(`Switched active field to: ${activeField.name}`, 'info', 'fa-mountain-sun');
}

// Bind dropdown switch event listener
if (fieldSelect) {
    fieldSelect.addEventListener('change', (e) => {
        switchField(e.target.value);
    });
}

// Add Field Modal Event Listeners
if (btnAddFieldBtn) {
    btnAddFieldBtn.addEventListener('click', () => {
        if (addFieldModal) {
            // Reset inputs
            const nameInput = document.getElementById('newFieldName');
            const sizeInput = document.getElementById('newFieldSize');
            if (nameInput) nameInput.value = '';
            if (sizeInput) sizeInput.value = '';
            addFieldModal.classList.add('active');
        }
    });
}

if (btnAddFieldCancel) {
    btnAddFieldCancel.addEventListener('click', () => {
        if (addFieldModal) addFieldModal.classList.remove('active');
    });
}

if (addFieldModal) {
    addFieldModal.addEventListener('click', (event) => {
        if (event.target === addFieldModal) addFieldModal.classList.remove('active');
    });
}

if (addFieldForm) {
    addFieldForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('newFieldName').value.trim();
        const crop = document.getElementById('newFieldCrop').value;
        const size = Number(document.getElementById('newFieldSize').value);
        const unit = document.getElementById('newFieldUnit').value;
        
            const deviceId = 'device_1';
        
        if (!name) {
            showFarmAlert('Please enter a field name.', 'warn', 'fa-triangle-exclamation');
            return;
        }
        
        if (!Number.isFinite(size) || size <= 0) {
            showFarmAlert('Please enter a valid field size.', 'warn', 'fa-triangle-exclamation');
            return;
        }
        
        let nextNumber = 1;
        if (appState.fields) {
            const keys = Object.keys(appState.fields);
            const numbers = keys.map(k => {
                const match = k.match(/^field_(\d+)$/);
                return match ? parseInt(match[1], 10) : 0;
            });
            if (numbers.length > 0) {
                nextNumber = Math.max(...numbers) + 1;
            }
        }
        const fieldId = `field_${nextNumber}`;
        const newField = {
            id: fieldId,
            name: name,
            crop: crop,
            fieldSize: size,
            unit: unit,
            deviceRegistry: {
                [deviceId]: { id: deviceId, name: 'Device 1' }
            },
            activeDeviceId: deviceId,
            'deviceToken(microController)': deviceId
        };
        
        if (db && appState.userId) {
            detachFirebaseListeners();
            appState.activeFieldId = fieldId;

            const defaultSensorData = createDefaultSensorData();

            Promise.all([
                db.ref(`users/${appState.userId}/fields/${fieldId}`).set(newField),
                db.ref(`users/${appState.userId}/fields/${fieldId}/devices/${deviceId}/sensorData`).set(defaultSensorData)
            ]).then(() => {
                if (addFieldModal) addFieldModal.classList.remove('active');
                showFarmAlert(`Added and switched to field: ${name}`, 'success', 'fa-circle-check');
            }).catch((err) => {
                showFarmAlert(`Failed to add field: ${err.message}`, 'danger', 'fa-circle-exclamation');
            });
        }
    });
}

function initClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clockDisplay').innerText = now.toLocaleTimeString('en-US', { hour12: false });
    }, 1000);
}

// Chart.js Configuration (Lighter, softer colors)
function initCharts() {
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
            x: { display: false },
            y: { display: false, min: 0 }
        },
        elements: {
            point: { radius: 0 },
            line: { tension: 0.4, borderWidth: 3 }
        }
    };

    const createChart = (id, color, fillGlow) => {
        const ctx = document.getElementById(id).getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 60);
        gradient.addColorStop(0, fillGlow);
        gradient.addColorStop(1, 'transparent');

        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: color,
                    backgroundColor: gradient,
                    fill: true
                }]
            },
            options: commonOptions
        });
    };

    sensorConfigs.forEach((sensor) => {
        charts[sensor.key] = createChart(sensor.chartCanvasId, sensor.chartColor, sensor.chartFill);
    });

    const liveCanvas = document.getElementById('chartLiveSensors');
    if (liveCanvas) {
        liveSensorChart = new Chart(liveCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: [],
                datasets: sensorConfigs.map((sensor) => ({
                    label: sensor.fallbackLabel,
                    data: [],
                    borderColor: sensor.chartColor,
                    backgroundColor: sensor.chartFill,
                    fill: false,
                    tension: 0.38,
                    borderWidth: 3,
                    pointRadius: 2,
                    pointHoverRadius: 4
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            color: '#64748b',
                            font: { weight: 'bold' }
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', maxTicksLimit: 6 } },
                    y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.18)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
    }
}

// WEATHER API LOGIC (Open-Meteo)
function fetchWeather() {
    if (appState.weatherLocation && Number.isFinite(appState.weatherLocation.lat) && Number.isFinite(appState.weatherLocation.lon)) {
        setText('wLocation', appState.weatherLocation.name || 'Saved Location');
        callWeatherApi(appState.weatherLocation.lat, appState.weatherLocation.lon);
        return;
    }

    // Attempt Geolocation first
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                document.getElementById('wLocation').innerText = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
                callWeatherApi(lat, lon);
            },
            error => {
                console.warn("Geolocation blocked, using default location (New Delhi).");
                document.getElementById('wLocation').innerText = "New Delhi, India (Default)";
                callWeatherApi(28.61, 77.20);
            }
        );
    } else {
        document.getElementById('wLocation').innerText = "New Delhi, India (Default)";
        callWeatherApi(28.61, 77.20);
    }
}

function setupWeatherControls() {
    if (weatherEditBtn && weatherSearchForm) {
        weatherEditBtn.addEventListener('click', () => {
            weatherSearchForm.hidden = !weatherSearchForm.hidden;
            if (!weatherSearchForm.hidden && weatherLocationInput) {
                weatherLocationInput.focus();
            }
        });
    }

    if (weatherAutoBtn) {
        weatherAutoBtn.addEventListener('click', () => {
            appState.weatherLocation = null;
            saveAppState();
            if (weatherSearchStatus) weatherSearchStatus.innerText = 'Using automatic location when available.';
            fetchWeather();
        });
    }

    if (weatherSearchForm) {
        weatherSearchForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const query = weatherLocationInput ? weatherLocationInput.value.trim() : '';
            if (!query) {
                if (weatherSearchStatus) weatherSearchStatus.innerText = 'Enter a location first.';
                return;
            }
            await searchWeatherLocation(query);
        });
    }
}

async function searchWeatherLocation(query) {
    if (weatherSearchStatus) weatherSearchStatus.innerText = 'Searching location...';
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
        const response = await fetch(url);
        const data = await response.json();
        const result = data.results && data.results[0];
        if (!result) {
            if (weatherSearchStatus) weatherSearchStatus.innerText = 'No matching place found.';
            return;
        }

        const locationName = [result.name, result.admin1, result.country].filter(Boolean).join(', ');
        appState.weatherLocation = {
            name: locationName,
            lat: Number(result.latitude),
            lon: Number(result.longitude)
        };
        saveAppState();
        setText('wLocation', locationName);
        if (weatherSearchStatus) weatherSearchStatus.innerText = `Weather set to ${locationName}.`;
        callWeatherApi(appState.weatherLocation.lat, appState.weatherLocation.lon);
    } catch (error) {
        console.error('Location search failed:', error);
        if (weatherSearchStatus) weatherSearchStatus.innerText = 'Location search failed. Try again.';
    }
}

async function callWeatherApi(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        updateWeatherUI(data);
    } catch (err) {
        console.error("Failed to fetch weather:", err);
        document.getElementById('wDesc').innerText = "Weather fetch failed.";
    }
}

function updateWeatherUI(data) {
    const current = data.current;
    const daily = data.daily;

    currentWeatherState.temp = current.temperature_2m;
    currentWeatherState.rain = current.precipitation;
    currentWeatherState.wind = current.wind_speed_10m;
    currentWeatherState.humid = current.relative_humidity_2m;
    currentWeatherState.code = current.weather_code;

    const wmo = wmoCodes[current.weather_code] || { desc: "Unknown", icon: "fa-cloud" };

    document.getElementById('wTemp').innerText = Math.round(current.temperature_2m);
    document.getElementById('wDesc').innerText = wmo.desc;
    document.getElementById('wMainIcon').className = `fa-solid ${wmo.icon} weather-icon-huge`;

    document.getElementById('wRain').innerText = current.precipitation;
    document.getElementById('wWind').innerText = current.wind_speed_10m;
    document.getElementById('wHumid').innerText = current.relative_humidity_2m;

    if (current.precipitation > 5) {
        showFarmAlert('Heavy rain detected. Avoid irrigation to prevent waterlogging.', 'warn', 'fa-cloud-showers-heavy');
    }
    if (current.temperature_2m > 40) {
        showFarmAlert('Extreme heat alert. Check crop stress and soil moisture often.', 'danger', 'fa-temperature-arrow-up');
    }
    if (current.wind_speed_10m > 40) {
        showFarmAlert('Strong wind alert. Secure loose farm equipment.', 'warn', 'fa-wind');
    }

    // Render 7 Day Forecast
    const container = document.getElementById('forecastContainer');
    container.innerHTML = '';

    for (let i = 0; i < daily.time.length; i++) {
        const dateStr = daily.time[i];
        const dateObj = new Date(dateStr);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

        const code = daily.weather_code[i];
        const dayWmo = wmoCodes[code] || { icon: "fa-cloud" };

        const minTemp = Math.round(daily.temperature_2m_min[i]);
        const maxTemp = Math.round(daily.temperature_2m_max[i]);

        const dayDiv = document.createElement('div');
        dayDiv.className = 'forecast-day';
        dayDiv.innerHTML = `
            <span class="day-name">${i === 0 ? 'Today' : dayName}</span>
            <i class="fa-solid ${dayWmo.icon}"></i>
            <div class="temps">
                <span class="min">${minTemp}°</span>
                <span class="max">${maxTemp}°</span>
            </div>
        `;
        container.appendChild(dayDiv);
    }
}

function updateSensorUI(key, val, idealRange, decimals = 1) {
    const sensorName = toPascalCase(key);
    const displayVal = val !== null ? val.toFixed(decimals) : '--';
    document.getElementById(`val${sensorName}`).innerText = displayVal;

    if (val !== null) {
        sensors[key].history.push(val);
        if (sensors[key].history.length > 10) sensors[key].history.shift();
        if (charts[key]) {
            charts[key].data.labels = sensors[key].history.map(() => '');
            charts[key].data.datasets[0].data = sensors[key].history;
            charts[key].update();
        }

        let interpKey = 'interp_normal';
        let trendClass = 'stable';
        let iconClass = 'fa-minus';

        if (val < idealRange[0] * 0.8) {
            interpKey = 'interp_critical'; trendClass = 'down'; iconClass = 'fa-arrow-down';
        } else if (val < idealRange[0]) {
            interpKey = 'interp_low'; trendClass = 'down'; iconClass = 'fa-arrow-down';
        } else if (val > idealRange[1] * 1.2) {
            interpKey = 'interp_critical'; trendClass = 'up'; iconClass = 'fa-arrow-up';
        } else if (val > idealRange[1]) {
            interpKey = 'interp_high'; trendClass = 'up'; iconClass = 'fa-arrow-up';
        } else {
            interpKey = 'interp_optimal'; trendClass = 'stable'; iconClass = 'fa-check';
        }

        sensorStatusKeys[key] = interpKey;

        const card = document.getElementById(`card${sensorName}`);
        const statusDiv = card.querySelector('.sensor-status');
        const trendSpan = statusDiv.querySelector('.trend');
        const interpSpan = statusDiv.querySelector('.interp');

        trendSpan.className = `trend ${trendClass}`;
        trendSpan.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        interpSpan.innerText = getTranslation(appState.lang, interpKey);
        updateLiveSensorChart();
    }
}

function updateLiveSensorChart() {
    if (!liveSensorChart) return;
    const maxLength = Math.max(1, ...sensorConfigs.map((sensor) => sensors[sensor.key].history.length));
    liveSensorChart.data.labels = Array.from({ length: maxLength }, (_, index) => `${index + 1}`);
    liveSensorChart.data.datasets.forEach((dataset, index) => {
        const sensor = sensorConfigs[index];
        dataset.data = sensors[sensor.key].history.slice(-maxLength);
    });
    liveSensorChart.update('none');
}

function resetSensorUI(key) {
    const sensorName = toPascalCase(key);
    const valueEl = document.getElementById(`val${sensorName}`);
    const card = document.getElementById(`card${sensorName}`);

    sensors[key].val = null;
    sensors[key].history = [];
    sensorStatusKeys[key] = 'interp_waiting';
    if (valueEl) valueEl.innerText = '--';

    if (charts[key]) {
        charts[key].data.labels = [];
        charts[key].data.datasets[0].data = [];
        charts[key].update();
    }
    updateLiveSensorChart();

    if (!card) return;

    const statusDiv = card.querySelector('.sensor-status');
    const trendSpan = statusDiv.querySelector('.trend');
    const interpSpan = statusDiv.querySelector('.interp');

    trendSpan.className = 'trend stable';
    trendSpan.innerHTML = '<i class="fa-solid fa-minus"></i>';
    interpSpan.innerText = getTranslation(appState.lang, 'interp_waiting');
}

function runAILogic(crop) {
    document.getElementById('aiWaterVal').innerText = crop.waterDemand;

    let health = "Optimal";
    let healthColor = "#2b8a3e";

    let m = sensors.moisture.val;
    currentAiRecKey = 'ai_rec_normal';

    if (m === null) {
        document.getElementById('aiSoilVal').innerText = "Waiting for data";
        document.getElementById('aiSoilVal').style.color = "#868e96";
        currentAiRecKey = 'ai_rec_no_data';
        health = "No Data";
        healthColor = "#868e96";
    } else if (m < crop.irrigationRules.criticalMoisture) {
        document.getElementById('aiSoilVal').innerText = "Drying";
        document.getElementById('aiSoilVal').style.color = "#d9480f";

        if (typeof currentWeatherState.rain === 'number' && currentWeatherState.rain > 5) {
            currentAiRecKey = 'ai_rec_weather_wait';
            health = "Awaiting Rain";
            healthColor = "#e8590c";
        } else if (!appState.pumpActive) {
            currentAiRecKey = 'ai_rec_start_pump';
            health = "Water Needed";
            healthColor = "#e03131";
            showFarmAlert('Soil moisture is low. Irrigation may be needed soon.', 'warn', 'fa-droplet-slash');
        }
    } else if (m > crop.irrigationRules.stopMoisture) {
        document.getElementById('aiSoilVal').innerText = "Saturated";
        document.getElementById('aiSoilVal').style.color = "#1971c2";
        showFarmAlert('Over watering risk: soil is already saturated.', 'danger', 'fa-triangle-exclamation');
        if (appState.pumpActive) {
            currentAiRecKey = 'ai_rec_stop_pump';
            health = "Waterlogged Risk";
            healthColor = "#f08c00";
        }
    } else {
        document.getElementById('aiSoilVal').innerText = "Optimal";
        document.getElementById('aiSoilVal').style.color = "#2b8a3e";
    }

    document.getElementById('aiHealthVal').innerText = health;
    document.getElementById('aiHealthVal').style.color = healthColor;

    document.getElementById('aiRecText').innerText = getTranslation(appState.lang, currentAiRecKey);
}

// Pump Control Logic
const btnStart = document.getElementById('btnStartPump');
const btnStop = document.getElementById('btnStopPump');
const modal = document.getElementById('confirmModal');
const btnCancel = document.getElementById('btnCancelCmd');
const btnConfirm = document.getElementById('btnConfirmCmd');
let pendingAction = null;

btnStart.addEventListener('click', () => {
    pendingAction = 'start';
    document.getElementById('confirmText').innerText = "Set pump active to START WATER PUMP via controller?";
    modal.classList.add('active');
});

btnStop.addEventListener('click', () => {
    pendingAction = 'stop';
    document.getElementById('confirmText').innerText = "Set pump active to STOP WATER PUMP via controller?";
    modal.classList.add('active');
});

btnCancel.addEventListener('click', () => {
    modal.classList.remove('active');
    pendingAction = null;
});

btnConfirm.addEventListener('click', () => {
    modal.classList.remove('active');
    if (pendingAction === 'start') executePumpCmd('start');
    if (pendingAction === 'stop') executePumpCmd('stop');
});

function executePumpCmd(action) {
    const badge = document.getElementById('pumpBadge');
    const flow = document.getElementById('connFlow');

    btnStart.disabled = true;
    btnStop.disabled = true;

    badge.className = 'pump-status-badge connecting';
    badge.innerHTML = `<i class="fa-solid fa-satellite-dish fa-spin"></i> <span>Connecting...</span>`;
    flow.classList.add('active');

    showFarmAlert(`Sending pump ${action} request to the controller.`, 'info', 'fa-satellite-dish');

    // Send desired pump state via Firebase to ESP32
    sendPumpCommand(action);

    // Status will be updated via Firebase listener (listenPumpStatus)
    // No need for timeout simulation - ESP32 will update pump/status
}

function setupPumpTimerControls() {
    if (btnSetPumpTimer) {
        btnSetPumpTimer.addEventListener('click', () => {
            const minutes = Number(pumpTimerMinutes ? pumpTimerMinutes.value : 0);
            if (!Number.isFinite(minutes) || minutes < 1) {
                showFarmAlert('Set the pump timer to at least 1 minute.', 'warn', 'fa-clock');
                return;
            }
            appState.pumpTimerEndsAt = Date.now() + (minutes * 60 * 1000);
            saveAppState();
            restorePumpTimer();
            showFarmAlert(`Pump will stop automatically in ${minutes} minute${minutes === 1 ? '' : 's'}.`, 'success', 'fa-clock');
        });
    }

    if (btnCancelPumpTimer) {
        btnCancelPumpTimer.addEventListener('click', () => {
            cancelPumpTimer('Timer cancelled.');
        });
    }
}

function restorePumpTimer() {
    if (pumpTimerInterval) {
        clearInterval(pumpTimerInterval);
        pumpTimerInterval = null;
    }
    updatePumpTimerDisplay();
    if (appState.pumpTimerEndsAt && appState.pumpTimerEndsAt > Date.now()) {
        pumpTimerInterval = setInterval(updatePumpTimerDisplay, 1000);
    }
}

function cancelPumpTimer(message = 'Timer is off.') {
    appState.pumpTimerEndsAt = null;
    saveAppState();
    if (pumpTimerInterval) {
        clearInterval(pumpTimerInterval);
        pumpTimerInterval = null;
    }
    if (pumpTimerStatus) pumpTimerStatus.innerText = message;
}

function updatePumpTimerDisplay() {
    if (!pumpTimerStatus) return;
    if (!appState.pumpTimerEndsAt) {
        pumpTimerStatus.innerText = 'Timer is off.';
        return;
    }

    const remaining = appState.pumpTimerEndsAt - Date.now();
    if (remaining <= 0) {
        cancelPumpTimer('Timer complete. Stopping pump...');
        executePumpCmd('stop');
        showFarmAlert('Auto stop timer finished. Pump stop request sent.', 'success', 'fa-stopwatch');
        return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    pumpTimerStatus.innerText = `Stops in ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updatePumpUI(status) {
    const badge = document.getElementById('pumpBadge');
    const flow = document.getElementById('connFlow');
    const circle = document.getElementById('pumpCircle');

    btnStart.disabled = status === 'on';
    btnStop.disabled = status !== 'on';
    flow.classList.toggle('active', status === 'on');
    circle.classList.toggle('active', status === 'on');

    // Update bottom navigation Pump button state and icons
    const pumpNavItem = document.querySelector('.bottom-nav-item.nav-primary');
    if (pumpNavItem) {
        const icon = pumpNavItem.querySelector('i');
        if (status === 'on') {
            pumpNavItem.classList.add('pump-running');
            if (icon) {
                icon.className = 'fa-solid fa-faucet-drip';
            }
        } else {
            pumpNavItem.classList.remove('pump-running');
            if (icon) {
                icon.className = 'fa-solid fa-faucet';
            }
        }
    }

    if (status === 'on') {
        badge.className = 'pump-status-badge online';
        badge.innerHTML = '<i class="fa-solid fa-power-off"></i> <span>PUMP ON</span>';
        showFarmAlert('Pump is running. Keep an eye on soil moisture.', 'info', 'fa-faucet-drip');
    } else if (status === 'off') {
        badge.className = 'pump-status-badge offline';
        badge.innerHTML = '<i class="fa-solid fa-power-off"></i> <span>PUMP OFF</span>';
    } else {
        badge.className = 'pump-status-badge offline';
        badge.innerHTML = '<i class="fa-solid fa-circle-question"></i> <span>NO STATUS</span>';
    }
}

function updateUsageSummary() {
    const waterValue = appState.waterUsed === null ? '--' : Math.floor(appState.waterUsed);
    const energyValue = appState.isGuest || appState.energyUsed === null ? '--' : appState.energyUsed.toFixed(2);

    const dispWater = document.getElementById('dispWater');
    const dispEnergy = document.getElementById('dispEnergy');
    const pumpWaterUsed = document.getElementById('pumpWaterUsed');
    const pumpEnergyUsed = document.getElementById('pumpEnergyUsed');

    if (dispWater) dispWater.innerText = waterValue;
    if (dispEnergy) dispEnergy.innerText = energyValue;
    if (pumpWaterUsed) pumpWaterUsed.innerText = waterValue;
    if (pumpEnergyUsed) pumpEnergyUsed.innerText = energyValue;
}

function showFarmAlert(message, type = 'info', icon = 'fa-circle-info') {
    const alerts = document.getElementById('farmAlerts');
    if (!alerts) return;

    const duplicate = Array.from(alerts.querySelectorAll('.farm-alert span'))
        .some((alertText) => alertText.innerText === message);
    if (duplicate) return;

    const entry = document.createElement('div');
    entry.className = `farm-alert ${type}`;
    entry.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;

    alerts.prepend(entry);
    while (alerts.children.length > 5) {
        alerts.removeChild(alerts.lastElementChild);
    }
}

window.addEventListener('beforeunload', () => {
    if (auth && auth.currentUser && auth.currentUser.isAnonymous) {
        const uid = auth.currentUser.uid;
        localStorage.removeItem(getAppStateKey(uid));
        localStorage.removeItem(getAnonDeleteKey(uid));
        sessionStorage.clear();
        auth.signOut();
    }
});
