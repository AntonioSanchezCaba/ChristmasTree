// =====================================================
// AUTENTICACIÓN CON SUPABASE
// =====================================================

// Inicializar Supabase
const SUPABASE_URL = 'https://mcwsdinbxwfomkgtolhf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jd3NkaW5ieHdmb21rZ3RvbGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjU2MzcsImV4cCI6MjA3ODI0MTYzN30.rjJpb2OQRui-1uIsn2VwE_zX-I5V2CKgM3MveZSXxW4';

// Use different variable name to avoid conflict with window.supabase
let supabaseClient = null;

function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized');
        return true;
    } else {
        console.error('❌ Supabase SDK not loaded');
        return false;
    }
}

let currentUser = null;
let authInitialized = false;

// =====================================================
// FUNCIONES DE CAMBIO DE TAB
// =====================================================

function switchAuthTab(tab) {
    // Cambiar tabs activos
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    if (tab === 'login') {
        document.querySelector('.auth-tab:first-child').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelector('.auth-tab:last-child').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }

    // Limpiar mensajes
    hideAuthMessages();
}

// =====================================================
// VALIDACIÓN DE CONTRASEÑA FUERTE
// =====================================================

function checkPasswordStrength(password) {
    const strengthIndicator = document.getElementById('passwordStrength');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    if (!password) {
        strengthIndicator.classList.remove('show');
        return { strength: 'none', valid: false };
    }

    strengthIndicator.classList.add('show');

    let strength = 0;
    let feedback = [];

    // Criterios de contraseña fuerte
    if (password.length >= 8) strength++;
    else feedback.push('Mínimo 8 caracteres');

    if (password.length >= 12) strength++;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    else feedback.push('Mayúsculas y minúsculas');

    if (/[0-9]/.test(password)) strength++;
    else feedback.push('Al menos un número');

    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    else feedback.push('Al menos un símbolo (!@#$%^&*)');

    // Actualizar visualización
    strengthFill.className = 'strength-fill';

    if (strength <= 2) {
        strengthFill.classList.add('weak');
        strengthText.textContent = '❌ Débil: ' + feedback.join(', ');
        return { strength: 'weak', valid: false };
    } else if (strength <= 4) {
        strengthFill.classList.add('medium');
        strengthText.textContent = '⚠️ Media: ' + (feedback.length > 0 ? feedback.join(', ') : 'Añade símbolos para mayor seguridad');
        return { strength: 'medium', valid: true };
    } else {
        strengthFill.classList.add('strong');
        strengthText.textContent = '✅ Fuerte: Contraseña segura';
        return { strength: 'strong', valid: true };
    }
}

// =====================================================
// FUNCIONES DE AUTENTICACIÓN
// =====================================================

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}

function showAuthSuccess(message) {
    const successDiv = document.getElementById('authSuccess');
    successDiv.textContent = message;
    successDiv.classList.add('show');
    setTimeout(() => successDiv.classList.remove('show'), 5000);
}

function hideAuthMessages() {
    document.getElementById('authError').classList.remove('show');
    document.getElementById('authSuccess').classList.remove('show');
}

// REGISTRO
async function handleRegister(event) {
    event.preventDefault();
    hideAuthMessages();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Validar que las contraseñas coincidan
    if (password !== passwordConfirm) {
        showAuthError('❌ Las contraseñas no coinciden');
        return;
    }

    // Validar fortaleza de contraseña
    const passwordCheck = checkPasswordStrength(password);
    if (!passwordCheck.valid) {
        showAuthError('❌ La contraseña no es lo suficientemente fuerte');
        return;
    }

    // Deshabilitar botón y mostrar loading
    const button = document.getElementById('registerButton');
    button.disabled = true;
    button.innerHTML = '<span class="auth-loading"></span> Creando cuenta...';

    // VERIFICAR LÍMITE DE USUARIOS (máximo 3)
    try {
        const { data: userCount, error: countError } = await supabaseClient.rpc('count_registered_users');

        if (countError) {
            console.error('Error al verificar límite de usuarios:', countError);
            showAuthError('❌ Error al verificar disponibilidad. Por favor, asegúrate de haber configurado la función SQL en Supabase (ver SUPABASE_SETUP.md)');
            button.disabled = false;
            button.textContent = 'Crear Cuenta';
            return;
        }

        if (userCount >= 3) {
            showAuthError('🚫 Límite de usuarios alcanzado. Solo se permiten 3 usuarios registrados.');
            button.disabled = false;
            button.textContent = 'Crear Cuenta';
            return;
        }
    } catch (e) {
        console.error('Error al verificar límite:', e);
        showAuthError('❌ Error al verificar disponibilidad. Verifica la configuración de Supabase.');
        button.disabled = false;
        button.textContent = 'Crear Cuenta';
        return;
    }

    try {
        // Usar la URL completa actual (sin hash ni query params)
        const currentUrl = window.location.origin + window.location.pathname;

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: currentUrl
            }
        });

        if (error) throw error;

        if (data.user && !data.user.confirmed_at) {
            showAuthSuccess('✅ Cuenta creada! Por favor, revisa tu correo para confirmar tu cuenta.');
        } else {
            showAuthSuccess('✅ Cuenta creada exitosamente!');
            setTimeout(() => switchAuthTab('login'), 2000);
        }

        // Limpiar formulario
        document.getElementById('registerForm').reset();
        document.getElementById('passwordStrength').classList.remove('show');

    } catch (error) {
        console.error('Error en registro:', error);
        showAuthError('❌ ' + (error.message || 'Error al crear la cuenta'));
    } finally {
        button.disabled = false;
        button.textContent = 'Crear Cuenta';
    }
}

// LOGIN
async function handleLogin(event) {
    event.preventDefault();
    hideAuthMessages();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const button = document.getElementById('loginButton');
    button.disabled = true;
    button.innerHTML = '<span class="auth-loading"></span> Iniciando sesión...';

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        if (data.user) {
            showAuthSuccess('✅ Bienvenido de vuelta!');
            currentUser = data.user;

            // Ocultar modal de autenticación y mostrar aplicación
            setTimeout(() => {
                document.getElementById('authOverlay').classList.add('hidden');
                document.getElementById('loginForm').reset();
            }, 1000);
        }

    } catch (error) {
        console.error('Error en login:', error);
        if (error.message.includes('Email not confirmed')) {
            showAuthError('❌ Por favor, confirma tu correo electrónico antes de iniciar sesión');
        } else if (error.message.includes('Invalid login credentials')) {
            showAuthError('❌ Correo o contraseña incorrectos');
        } else {
            showAuthError('❌ ' + (error.message || 'Error al iniciar sesión'));
        }
    } finally {
        button.disabled = false;
        button.textContent = 'Iniciar Sesión';
    }
}

// LOGOUT
async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;

        currentUser = null;
        document.getElementById('authOverlay').classList.remove('hidden');

    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// FORGOT PASSWORD
async function handleForgotPassword() {
    const email = prompt('Ingresa tu correo electrónico para recuperar tu contraseña:');

    if (!email) return;

    try {
        // Usar la URL completa actual (sin hash ni query params)
        const currentUrl = window.location.origin + window.location.pathname;

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: currentUrl
        });

        if (error) throw error;

        showAuthSuccess('✅ Se ha enviado un enlace de recuperación a tu correo');

    } catch (error) {
        console.error('Error al recuperar contraseña:', error);
        showAuthError('❌ ' + (error.message || 'Error al enviar el correo'));
    }
}

// OAUTH LOGIN
async function handleOAuthLogin(provider) {
    hideAuthMessages();

    try {
        // Usar la URL completa actual (sin hash ni query params)
        const currentUrl = window.location.origin + window.location.pathname;

        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: currentUrl
            }
        });

        if (error) throw error;

    } catch (error) {
        console.error('Error en OAuth:', error);
        showAuthError('❌ ' + (error.message || 'Error al iniciar sesión con ' + provider));
    }
}

// VERIFICAR SESIÓN AL CARGAR
async function checkAuthSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) throw error;

        if (session && session.user) {
            currentUser = session.user;
            document.getElementById('authOverlay').style.display = 'none';
            document.getElementById('authOverlay').classList.add('hidden');
            updateUserInfo(session.user);
        } else {
            document.getElementById('authOverlay').style.display = 'flex';
            document.getElementById('authOverlay').classList.remove('hidden');
            hideUserInfo();
        }
        authInitialized = true;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        document.getElementById('authOverlay').style.display = 'flex';
        document.getElementById('authOverlay').classList.remove('hidden');
        hideUserInfo();
        authInitialized = true;
    }
}

// Show login modal
function showLoginModal() {
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('authOverlay').classList.remove('hidden');
}

// Toggle user dropdown
function toggleUserDropdown() {
    const menu = document.getElementById('navDropdownMenu');
    menu.classList.toggle('show');
}

// Close user dropdown
function closeUserDropdown() {
    const menu = document.getElementById('navDropdownMenu');
    menu.classList.remove('show');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('navUserDropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        closeUserDropdown();
    }
});

// ACTUALIZAR INFO DE USUARIO EN UI
function updateUserInfo(user) {
    console.log('🔄 updateUserInfo called with:', user?.email);
    
    if (user && user.email) {
        // Update sidebar info
        const userEmailEl = document.getElementById('userEmail');
        const userInfoEl = document.getElementById('userInfo');
        if (userEmailEl) userEmailEl.textContent = user.email;
        if (userInfoEl) userInfoEl.style.display = 'block';

        // Update nav bar - show user, hide login
        const navAuthButtons = document.getElementById('navAuthButtons');
        const navUserDropdown = document.getElementById('navUserDropdown');
        const navUserName = document.getElementById('navUserName');

        console.log('📍 Nav elements:', {
            navAuthButtons: navAuthButtons ? 'found' : 'NOT FOUND',
            navUserDropdown: navUserDropdown ? 'found' : 'NOT FOUND',
            navUserName: navUserName ? 'found' : 'NOT FOUND'
        });

        if (navAuthButtons) {
            navAuthButtons.style.cssText = 'display: none !important;';
        }
        if (navUserDropdown) {
            navUserDropdown.style.cssText = 'display: flex !important; position: relative;';
        }
        if (navUserName) {
            navUserName.textContent = user.email.split('@')[0];
        }
        
        console.log('✅ Nav bar updated for user:', user.email);
        
        // Verify the change took effect
        setTimeout(() => {
            const dropdown = document.getElementById('navUserDropdown');
            console.log('🔍 Verification - navUserDropdown display:', dropdown?.style.display);
        }, 100);
    }
}

// OCULTAR INFO DE USUARIO
function hideUserInfo() {
    console.log('🔄 hideUserInfo called');
    
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) userInfoEl.style.display = 'none';

    // Update nav bar - show login, hide user
    const navAuthButtons = document.getElementById('navAuthButtons');
    const navUserDropdown = document.getElementById('navUserDropdown');

    if (navAuthButtons) {
        navAuthButtons.style.cssText = 'display: flex !important;';
    }
    if (navUserDropdown) {
        navUserDropdown.style.cssText = 'display: none !important;';
    }
    
    console.log('✅ Nav bar reset to logged-out state');
}

// =====================================================
// VARIABLES GLOBALES
// =====================================================

let scene, camera, renderer;
let ledGroup;
let ledMeshes = [];
let ledColors = {};
let ledPositions = [];

const totalLeds = 179;
let paintMode = false;
let selectedColor = '#ff0000';
let currentBrightness = 128;

let effectAnimationInterval = null;
let localAnimationInterval = null;
let currentEffect = null;
let currentLocalAnimation = null;
let currentEffectId = 0; // Efecto actual de WLED (fx)
let currentPaletteId = 0; // Paleta actual de WLED (pal)

// Variable para guardar el último estado de WLED
let pendingWLEDState = null;
let ledsReady = false;

// Protección contra loops: rastrear último estado procesado
let lastProcessedState = null;
let lastProcessedTime = 0;

// Flag para rastrear si ya aplicamos el brillo inicial desde localStorage
let initialBrightnessSet = false;

// CONFIGURACIÓN MQTT MOSQUITTO
let mqttClient = null;
const MQTT_CONFIG = {
    broker: 'wss://mqtt.vittence.com:8084/mqtt',
    topic: 'wled/tree/api',
    username: '',
    password: ''
};
let COLOR_ORDER = 'RGB';

// VARIABLES DE PROGRAMACIÓN
let schedules = [];
let schedulerInterval = null;
let lastScheduleState = null;
let wledIsOn = false; // Rastrea si WLED está encendido o apagado
let wledStateReceived = false; // Rastrea si hemos recibido al menos un estado de WLED
let userTimezone = 'America/Santo_Domingo'; // Zona horaria del usuario

// Días de la semana
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
// =====================================================
// FUNCIONES DE SCHEDULE MODAL
// =====================================================

function openSchedule() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.classList.add('active');
        loadSchedules();
        renderScheduleGrid();
        updateSchedulerStatus();
    }
}

function closeSchedule() {
    const modal = document.getElementById('scheduleModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function closeSchedule() {
    const modal = document.getElementById('scheduleModal');
    modal.classList.add('closing');
    
    setTimeout(() => {
        modal.classList.remove('active');
        modal.classList.remove('closing');
    }, 300);
}

// =====================================================
// SISTEMA DE PROGRAMACIÓN AVANZADO
// =====================================================

function loadSchedules() {
    try {
        // Intentar cargar horarios normales
        const savedSchedules = localStorage.getItem('wledSchedules');
        if (savedSchedules && savedSchedules !== 'undefined') {
            schedules = JSON.parse(savedSchedules);
            addDebugLog(`📅 ${schedules.length} horarios cargados desde localStorage`, 'info');
        } else {
            // Intentar cargar desde respaldo
            const backup = localStorage.getItem('wledSchedules_backup');
            if (backup && backup !== 'undefined') {
                const backupData = JSON.parse(backup);
                schedules = backupData.schedules || [];
                addDebugLog(`📅 ${schedules.length} horarios recuperados desde respaldo`, 'info');
                // Restaurar el archivo principal
                localStorage.setItem('wledSchedules', JSON.stringify(schedules));
            }
        }

        const enabled = localStorage.getItem('schedulerEnabled') === 'true';
        const checkbox = document.getElementById('schedulerEnabled');
        if (checkbox) {
            checkbox.checked = enabled;
        }
    } catch (e) {
        console.error('Error al cargar horarios:', e);
        addDebugLog('❌ Error al cargar horarios: ' + e.message, 'error');
        schedules = []; // Resetear a array vacío en caso de error
    }
}

function saveSchedules() {
    try {
        // Guardar en localStorage con respaldo
        const schedulesJson = JSON.stringify(schedules);
        localStorage.setItem('wledSchedules', schedulesJson);

        // Respaldo adicional con timestamp
        const backup = {
            schedules: schedules,
            enabled: document.getElementById('schedulerEnabled')?.checked || false,
            timezone: userTimezone,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('wledSchedules_backup', JSON.stringify(backup));

        renderScheduleGrid();

        // Publicar horarios en MQTT para sincronizar entre dispositivos
        if (mqttClient && mqttClient.connected) {
            const schedulesData = {
                schedules: schedules,
                enabled: document.getElementById('schedulerEnabled').checked,
                timezone: userTimezone,
                timestamp: Date.now()
            };
            mqttClient.publish('wled/tree/schedules', JSON.stringify(schedulesData), { retain: true });
            addDebugLog('📤 Horarios guardados y publicados', 'success');
        }
    } catch (e) {
        console.error('Error al guardar horarios:', e);
        addDebugLog('❌ Error al guardar horarios: ' + e.message, 'error');
    }
}

function addSchedule() {
    const selectedDays = [];
    for (let i = 0; i < 7; i++) {
        if (document.getElementById(`day-${i}`).checked) {
            selectedDays.push(i);
        }
    }
    
    if (selectedDays.length === 0) {
        showStatus('❌ Selecciona al menos un día', true);
        return;
    }
    
    const startTime = document.getElementById('scheduleStartTime').value;
    const endTime = document.getElementById('scheduleEndTime').value;
    
    if (!startTime || !endTime) {
        showStatus('❌ Define las horas de inicio y fin', true);
        return;
    }
    
    const schedule = {
        id: Date.now(),
        days: selectedDays,
        startTime: startTime,
        endTime: endTime,
    
        enabled: true
    };
    schedules.push(schedule);
    saveSchedules();
    
    // Limpiar formulario
    for (let i = 0; i < 7; i++) {
        document.getElementById(`day-${i}`).checked = false;
    }
    document.getElementById('scheduleStartTime').value = '07:00';
    document.getElementById('scheduleEndTime').value = '21:00';
    showStatus('✅ Horario agregado correctamente');
    addDebugLog('📅 Nuevo horario agregado', 'success');
}

function deleteSchedule(id) {
    schedules = schedules.filter(s => s.id !== id);
    saveSchedules();
    showStatus('✅ Horario eliminado');
    addDebugLog('🗑️ Horario eliminado', 'info');
}

function toggleSchedule(id) {
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
        schedule.enabled = !schedule.enabled;
        saveSchedules();
        addDebugLog(`📅 Horario ${schedule.enabled ? 'activado' : 'desactivado'}`, 'info');
    }
}

// INICIO: Solución #3 - Modificación de renderScheduleGrid para overnight
function renderScheduleGrid() {
    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = '';
    
    // Crear columnas para cada día
    for (let day = 0; day < 7; day++) {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = DAYS_SHORT[day];
        
        const daySchedule = document.createElement('div');
        daySchedule.className = 'day-schedule';
        
        // Agregar bloques de horario para este día
        schedules.forEach(schedule => {
            // Los horarios desactivados se muestran en gris (con clase 'inactive')
            const [startH, startM] = schedule.startTime.split(':').map(Number);
            const [endH, endM] = schedule.endTime.split(':').map(Number);
            
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            const isOvernight = endMinutes < startMinutes;

            if (!isOvernight) {
                // --- Horario Normal (mismo día) ---
                if (schedule.days.includes(day)) {
                    const block = createScheduleBlock(schedule, startMinutes, endMinutes);
                    daySchedule.appendChild(block);
                }
            } else {
                // --- Horario Overnight (pasa la medianoche) ---
                
                // 1. Parte que *empieza* hoy y termina mañana
                if (schedule.days.includes(day)) {
                    const block = createScheduleBlock(schedule, startMinutes, 1440); // 1440 = 24:00
                    daySchedule.appendChild(block);
                }

                // 2. Parte que *termina* hoy (empezó ayer)
                const prevDay = (day === 0) ? 6 : day - 1; // 6 = Sábado
                if (schedule.days.includes(prevDay)) {
                    const block = createScheduleBlock(schedule, 0, endMinutes); // 0 = 00:00
                    daySchedule.appendChild(block);
                }
            }
        });

        dayColumn.appendChild(dayHeader);
        dayColumn.appendChild(daySchedule);
        grid.appendChild(dayColumn);
    }
}
// FIN: Solución #3

// INICIO: Solución #2 y #3 - Modificación de createScheduleBlock
// (Ahora acepta startMinutes y endMinutes para manejar bloques divididos)
function createScheduleBlock(schedule, startMinutes, endMinutes) {
    
    const block = document.createElement('div');
    block.className = `schedule-block ${schedule.enabled ? '' : 'inactive'}`;
    
    // Calcular posición y altura
    const top = startMinutes; // 1 pixel por minuto
    const height = endMinutes - startMinutes;
    
    block.style.top = `${top}px`;
    block.style.height = `${height}px`;
    
    // Solución #2: Solo mostrar texto si el bloque es lo suficientemente alto
    if (height >= 40) { // 40 minutos o más
        block.innerHTML = `
            <strong>${schedule.startTime}</strong>
            <span>a</span>
            <strong>${schedule.endTime}</strong>
        `;
    } else {
        // Si es muy pequeño, al menos poner un tooltip
        block.title = `${schedule.startTime} - ${schedule.endTime}`;
    }
    
    // Lógica: 1 click = Activar/Desactivar. 2 clicks = Eliminar.
    // Usamos un sistema de detección de doble click para evitar conflictos
    let clickTimer = null;
    let clickCount = 0;

    block.addEventListener('click', (e) => {
        e.preventDefault();
        clickCount++;

        if (clickCount === 1) {
            // Primer click: esperar para ver si hay un segundo click
            clickTimer = setTimeout(() => {
                // Solo hubo un click → toggle activar/desactivar
                toggleSchedule(schedule.id);
                clickCount = 0;
            }, 250); // 250ms de espera para detectar doble click
        } else if (clickCount === 2) {
            // Segundo click → eliminar
            clearTimeout(clickTimer);
            clickCount = 0;

            if (confirm('¿Estás seguro de que deseas ELIMINAR este horario permanentemente?')) {
                deleteSchedule(schedule.id);
            }
        }
    });

    return block;
}
// FIN: Solución #2 y #3

// Funciones de horarios rápidos
function setWeekdaySchedule() {
    const schedule = {
        id: Date.now(),
        days: [1, 2, 3, 4, 5],
        startTime: '07:00',
        endTime: '21:00',
        enabled: true
    };
    schedules.push(schedule);
    saveSchedules();
    showStatus('✅ Horario Lun-Vie agregado');
}

function setWeekendSchedule() {
    const schedule = {
        id: Date.now(),
        days: [0, 6],
        startTime: '09:00',
         endTime: '23:00',
        enabled: true
    };
    schedules.push(schedule);
    saveSchedules();
    showStatus('✅ Horario Fin de Semana agregado');
}

function setEveningSchedule() {
    const schedule = {
        id: Date.now(),
        days: [0, 1, 2, 3, 4, 5, 6],
        startTime: '17:00',
        endTime: '23:00',
        enabled: true
    };
    schedules.push(schedule);
    saveSchedules();
    showStatus('✅ Horario de Tardes agregado');
}

function clearAllSchedules() {
    if (confirm('¿Eliminar TODOS los horarios programados?')) {
        schedules = [];
        saveSchedules();
        showStatus('✅ Todos los horarios eliminados');
    }
}

function updateScheduler() {
    const enabled = document.getElementById('schedulerEnabled').checked;
    localStorage.setItem('schedulerEnabled', enabled.toString());

    updateSchedulerStatus();

    if (enabled) {
        showStatus('✅ Programación automática activada');
        addDebugLog('⏰ Programación automática activada', 'success');
        checkSchedules();
    } else {
        showStatus('⏸️ Programación automática desactivada');
        addDebugLog('⏰ Programación automática desactivada', 'info');
    }

    // Publicar cambio en MQTT para sincronizar entre dispositivos
    if (mqttClient && mqttClient.connected) {
        const schedulesData = {
            schedules: schedules,
            enabled: enabled,
            timestamp: Date.now()
        };
        mqttClient.publish('wled/tree/schedules', JSON.stringify(schedulesData), { retain: true });
        addDebugLog('📤 Estado del scheduler publicado', 'success');
    }
}

function saveTimezone() {
    const select = document.getElementById('timezoneSelect');
    if (select) {
        userTimezone = select.value;
        localStorage.setItem('userTimezone', userTimezone);
        addDebugLog(`🌍 Zona horaria cambiada a: ${userTimezone}`, 'info');

        // Reiniciar el estado del scheduler para forzar nueva verificación
        lastScheduleState = null;

        // Verificar horarios con nueva timezone
        if (document.getElementById('schedulerEnabled')?.checked) {
            setTimeout(() => checkSchedules(), 100);
        }
    }
}

function loadTimezone() {
    const saved = localStorage.getItem('userTimezone');
    if (saved && saved !== 'undefined' && saved !== 'null') {
        userTimezone = saved;
        const select = document.getElementById('timezoneSelect');
        if (select) {
            select.value = userTimezone;
            addDebugLog(`🌍 Zona horaria cargada: ${userTimezone}`, 'info');
        }
    } else {
        // Asegurar que siempre haya un valor válido
        userTimezone = 'America/Santo_Domingo';
        localStorage.setItem('userTimezone', userTimezone);
        addDebugLog(`🌍 Zona horaria establecida por defecto: ${userTimezone}`, 'info');
        const select = document.getElementById('timezoneSelect');
        if (select) {
            select.value = userTimezone;
        }
    }
}

function updateSchedulerStatus() {
    // Verificar que el elemento exista antes de usarlo
    const schedulerCheckbox = document.getElementById('schedulerEnabled');
    const statusText = document.getElementById('scheduleStatusText');
    
    if (!schedulerCheckbox || !statusText) {
        return;
    }
    
    const enabled = schedulerCheckbox.checked;
    if (enabled) {
        const activeSchedule = getActiveSchedule();
        if (activeSchedule) {
            statusText.textContent = `✅ ENCENDIDO (hasta ${activeSchedule.endTime})`;
            statusText.style.color = '#28a745';
        } else {
            statusText.textContent = `⏸️ APAGADO (esperando horario)`;
            statusText.style.color = '#dc3545';
        }
    } else {
        statusText.textContent = 'Desactivado';
        statusText.style.color = '#6c757d';
    }
}

function getActiveSchedule() {
    // Validar que userTimezone esté definida
    if (!userTimezone || userTimezone === 'undefined') {
        userTimezone = 'America/Santo_Domingo';
    }

    // Obtener fecha/hora en la zona horaria configurada por el usuario
    let formatter, parts;
    try {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            weekday: 'short'
        });
        parts = formatter.formatToParts(new Date());
    } catch (e) {
        console.error('Error con zona horaria:', e);
        // Fallback a zona horaria por defecto
        userTimezone = 'America/Santo_Domingo';
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            weekday: 'short'
        });
        parts = formatter.formatToParts(new Date());
    }

    const hours = parseInt(parts.find(p => p.type === 'hour').value);
    const minutes = parseInt(parts.find(p => p.type === 'minute').value);
    const weekday = parts.find(p => p.type === 'weekday').value;

    // Mapear día de la semana
    const dayMap = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const currentDay = dayMap[weekday];
    const currentTime = hours * 60 + minutes;

    for (const schedule of schedules) {
        if (!schedule.enabled) continue;
        
        const [startH, startM] = schedule.startTime.split(':').map(Number);
        const [endH, endM] = schedule.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const isOvernight = endMinutes < startMinutes;

        if (!isOvernight) {
            // --- Horario Normal ---
            // Encendido desde startTime (inclusive) hasta endTime (exclusive)
            // Ejemplo: 18:00-23:00 significa encendido de 18:00 a 22:59, apaga a las 23:00
            if (schedule.days.includes(currentDay) && currentTime >= startMinutes && currentTime < endMinutes) {
                return schedule;
            }
        } else {
            // --- Horario Overnight ---
            const prevDay = (currentDay === 0) ? 6 : currentDay - 1;

            // 1. ¿Está activo *después* de medianoche? (p.ej. 02:00)
            // Desde 00:00 (inclusive) hasta endTime (exclusive)
            if (schedule.days.includes(prevDay) && currentTime >= 0 && currentTime < endMinutes) {
                return schedule;
            }
            // 2. ¿Está activo *antes* de medianoche? (p.ej. 22:00)
            // Desde startTime (inclusive) hasta 23:59 (inclusive)
            if (schedule.days.includes(currentDay) && currentTime >= startMinutes && currentTime <= 1439) {
                return schedule;
            }
        }
    }
    
    return null;
}

async function checkSchedules() {
    // VALIDAR PRIMERO SI HAY CONEXIÓN
    if (!mqttClient || !mqttClient.connected) {
        // No mostrar error constantemente, solo la primera vez
        if (schedulerInterval && !window.schedulerConnectionWarned) {
            addDebugLog('⚠️ Esperando conexión MQTT para scheduler...', 'info');
            window.schedulerConnectionWarned = true;
        }
        return;
    }

    // Resetear warning cuando se reconecta
    if (window.schedulerConnectionWarned) {
        addDebugLog('✅ Conexión MQTT restaurada - Scheduler activo', 'success');
        window.schedulerConnectionWarned = false;
    }

    // VALIDAR SI EL SCHEDULER ESTÁ HABILITADO
    if (!document.getElementById('schedulerEnabled') || !document.getElementById('schedulerEnabled').checked) {
        return;
    }

    const activeSchedule = getActiveSchedule();
    const shouldBeOn = activeSchedule !== null;

    // Al inicio, sincronizar lastScheduleState
    const isFirstRun = lastScheduleState === null;
    if (isFirstRun) {
        lastScheduleState = shouldBeOn;
        addDebugLog(`🔄 Estado inicial del scheduler: ${shouldBeOn ? 'Horario activo' : 'Fuera de horario'}`, 'info');
        // Si no hemos recibido estado de WLED, asumir apagado (wledIsOn = false)
        if (!wledStateReceived) {
            addDebugLog('ℹ️ Estado de WLED no recibido aún, asumiendo apagado inicialmente', 'info');
            wledIsOn = false;
        }
    }

    // Detectar cambios de horario (transición de encendido/apagado)
    const scheduleStateChanged = !isFirstRun && (lastScheduleState !== shouldBeOn);

    // Detectar desincronización: el estado real no coincide con el horario
    // SOLO verificar desincronización después de la primera ejecución
    const isOutOfSync = !isFirstRun && (wledIsOn !== shouldBeOn);

    // Log para debug SOLO cuando hay cambios o desincronización
    if (scheduleStateChanged || isOutOfSync) {
        addDebugLog(`🔍 Verificación: shouldBeOn=${shouldBeOn}, wledIsOn=${wledIsOn}, isOutOfSync=${isOutOfSync}`, 'info');
    }

    if (scheduleStateChanged) {
        // El horario cambió (ej: pasó de 22:59 a 23:00)
        lastScheduleState = shouldBeOn;
        addDebugLog(`⏰ Cambio de horario detectado: ${shouldBeOn ? 'Entrando en horario' : 'Saliendo de horario'}`, 'info');
    }

    // Forzar el estado correcto si hay cambio o desincronización
    if (scheduleStateChanged || isOutOfSync) {
        if (shouldBeOn && !wledIsOn) {
            // Debe estar encendido pero está apagado
            addDebugLog('⏰ Horario activo - Encendiendo LEDs', 'success');
            showStatus('⏰ Horario: Encendiendo LEDs');

            await sendMQTTCommand({
                "on": true,
                "bri": currentBrightness
            });
            wledIsOn = true;
        } else if (!shouldBeOn && wledIsOn) {
            // Debe estar apagado pero está encendido (forzar apagado)
            addDebugLog('⏰ Fuera de horario - Apagando LEDs (forzado)', 'info');
            showStatus('⏰ Fuera de horario: Apagando LEDs');

            await sendMQTTCommand({
                "on": false
            });
            updateAllLEDsVisual('#000000');
            wledIsOn = false;
        }
    }

    updateSchedulerStatus();
}

async function testScheduleOff() {
    addDebugLog('🧪 Test: Enviando comando OFF completo', 'info');
    const offCommand = {
        "on": false,
        "bri": 0,
        "seg": [{
            "id": 0,
            "on": false,
            "bri": 0,
            "fx": 0,
            "col": [[0,0,0], [0,0,0], [0,0,0]]
        }],
        "transition": 0
     };
    
    const success = await sendMQTTCommand(offCommand);
    if (success) {
        updateAllLEDsVisual('#000000');
        showStatus('✅ Comando OFF de prueba enviado');
    }
}

// =====================================================
// DEBUG LOG
// =====================================================

function addDebugLog(message, type = 'info') {
    const logDiv = document.getElementById('debugLog');
    const entry = document.createElement('div');
    entry.className = type;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
    while (logDiv.children.length > 50) {
        logDiv.removeChild(logDiv.firstChild);
    }
}

// =====================================================
// CONEXIÓN MQTT (mantener las funciones existentes)
// =====================================================

function initMQTT() {
    addDebugLog('🔌 Iniciando conexión a Mosquitto...', 'info');
    addDebugLog(`📡 Broker: ${MQTT_CONFIG.broker}`, 'info');
    
    const options = {
        clientId: 'web-tree-' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        protocol: 'wss',
         protocolVersion: 4,
        rejectUnauthorized: true,
        keepalive: 60
    };
    if (MQTT_CONFIG.username) {
        options.username = MQTT_CONFIG.username;
        options.password = MQTT_CONFIG.password;
    }
    
    try {
        mqttClient = mqtt.connect(MQTT_CONFIG.broker, options);
        mqttClient.on('connect', () => {
            addDebugLog('✅ Conectado exitosamente a Mosquitto!', 'success');
            document.getElementById('connectionStatus').className = 'connection-status connected';
            document.getElementById('connectionStatus').textContent = '✅ Conectado';
            
             mqttClient.subscribe('wled/tree/#', (err) => {
                if (!err) {
                    addDebugLog('📡 Suscrito a topics WLED', 'success');
                    addDebugLog('⏳ Esperando estado de WLED desde wled/tree/v...', 'info');

                    // WLED publica automáticamente su estado al topic wled/tree/v en formato XML
                    // No es necesario solicitar el estado manualmente
                    // El estado llegará en los próximos segundos si MQTT está habilitado en WLED

                    // Publicar horarios locales después de suscribirse
                    // Si hay horarios retenidos en MQTT, llegarán primero y sobrescribirán estos
                    setTimeout(() => {
                        if (schedules.length > 0 || document.getElementById('schedulerEnabled').checked) {
                            const schedulesData = {
                                schedules: schedules,
                                enabled: document.getElementById('schedulerEnabled').checked,
                                timestamp: Date.now()
                            };
                            mqttClient.publish('wled/tree/schedules', JSON.stringify(schedulesData), { retain: true });
                            addDebugLog('📤 Horarios locales publicados al conectar', 'info');
                        }
                    }, 500);
                } else {
                    addDebugLog('⚠️ Error al suscribirse: ' + err.message, 'error');
                }
            });
        });
        mqttClient.on('error', (err) => {
            addDebugLog('❌ Error MQTT: ' + err.message, 'error');
            document.getElementById('connectionStatus').className = 'connection-status disconnected';
            document.getElementById('connectionStatus').textContent = '❌ Error de conexión';
        });
        mqttClient.on('reconnect', () => {
            addDebugLog('🔄 Intentando reconectar...', 'info');
            document.getElementById('connectionStatus').className = 'connection-status connecting';
            document.getElementById('connectionStatus').textContent = '🔄 Reconectando...';

            // Al reconectar, resetear el estado del scheduler para forzar nueva verificación
            lastScheduleState = null;
            wledStateReceived = false;
        });
        mqttClient.on('offline', () => {
            addDebugLog('⚠️ Cliente MQTT offline', 'error');
            document.getElementById('connectionStatus').className = 'connection-status disconnected';
            document.getElementById('connectionStatus').textContent = '⚠️ Desconectado';
        });

        // INICIO: Solución #5 - Procesar mensajes de estado de WLED
        mqttClient.on('message', (topic, message) => {
            const payloadStr = message.toString();

            // Procesar mensajes de brillo para sincronización entre dispositivos
            if (topic === 'wled/tree/brightness') {
                const brightness = parseInt(payloadStr);
                if (!isNaN(brightness) && brightness >= 0 && brightness <= 255) {
                    // Solo actualizar si es diferente del actual (evitar loops)
                    if (Math.abs(brightness - currentBrightness) > 2) {
                        currentBrightness = brightness;
                        document.getElementById('brightness').value = brightness;
                        updateBrightnessLabel(brightness);
                        localStorage.setItem('lastBrightness', brightness.toString());
                        addDebugLog(`💡 Brillo sincronizado desde otro dispositivo: ${brightness}`, 'success');
                    }
                }
                return;
            }

            // Procesar mensajes de horarios para sincronización entre dispositivos
            if (topic === 'wled/tree/schedules') {
                try {
                    const data = JSON.parse(payloadStr);
                    if (data.schedules && Array.isArray(data.schedules)) {
                        // Evitar loop si es nuestro propio mensaje (comparar timestamp reciente)
                        const timeDiff = Date.now() - (data.timestamp || 0);
                        if (timeDiff > 1000) { // Solo aplicar si tiene más de 1 segundo
                            schedules = data.schedules;
                            localStorage.setItem('wledSchedules', JSON.stringify(schedules));

                            if (typeof data.enabled !== 'undefined') {
                                document.getElementById('schedulerEnabled').checked = data.enabled;
                                localStorage.setItem('schedulerEnabled', data.enabled.toString());
                            }

                            renderScheduleGrid();
                            addDebugLog('📥 Horarios sincronizados desde otro dispositivo', 'success');
                        }
                    }
                } catch (e) {
                    addDebugLog('❌ Error al procesar horarios: ' + e.message, 'error');
                }
                return;
            }

            // Procesar mensajes de estado de WLED (v, state, o api con JSON de estado)
            if (topic === 'wled/tree/v' || topic === 'wled/tree/state' || topic === 'wled/tree/api') {
                const trimmedPayload = payloadStr.trim();

                // Mostrar preview del contenido (incluso si está vacío)
                if (trimmedPayload.length === 0) {
                    addDebugLog(`📨 ${topic}: (vacío)`, 'info');
                    return;
                }

                const preview = trimmedPayload.substring(0, 80);
                addDebugLog(`📨 ${topic}: ${preview}${trimmedPayload.length > 80 ? '...' : ''}`, 'success');

                // Detectar si es XML
                if (trimmedPayload.startsWith('<?xml') || trimmedPayload.startsWith('<')) {
                    const state = parseWLEDXML(trimmedPayload);
                    if (state) {
                        handleWLEDState(state);
                    }
                    return;
                }

                // Validar que el payload sea JSON válido antes de parsear
                if (!trimmedPayload.startsWith('{') && !trimmedPayload.startsWith('[')) {
                    addDebugLog(`⚠️ ${topic}: Formato desconocido`, 'error');
                    return;
                }

                try {
                    const data = JSON.parse(payloadStr);

                    // Solo procesar si es un estado COMPLETO (no comandos parciales)
                    // Un estado completo debe tener al menos 'state' o tanto 'on' como 'seg'
                    const isCompleteState = data.state || (data.seg && data.on !== undefined);

                    if (isCompleteState) {
                        addDebugLog(`📊 Estado completo detectado en ${topic}`, 'info');
                        const state = data.state || data;
                        handleWLEDState(state);
                    } else {
                        addDebugLog(`⏩ Comando parcial ignorado en ${topic} (solo tiene: ${Object.keys(data).join(',')})`, 'info');
                    }
                } catch (e) {
                    // Ignorar errores de JSON parse silenciosamente
                }
            }
            // Ignorar silenciosamente otros topics (g, c, status, etc.)
        });
        // FIN: Solución #5

    } catch (error) {
        addDebugLog('❌ Error crítico al inicializar: ' + error.message, 'error');
    }
}

function reconnectMQTT() {
    if (mqttClient) {
        addDebugLog('🔄 Desconectando cliente anterior...', 'info');
        mqttClient.end(true);
        mqttClient = null;
    }
    setTimeout(() => {
        initMQTT();
    }, 500);
}

// Función para parsear XML de WLED y convertirlo a formato JSON (actualizado)
function parseWLEDXML(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        // Verificar si hay errores de parseo
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Error al parsear XML');
        }

        const vs = xmlDoc.querySelector('vs');
        if (!vs) {
            throw new Error('No se encontró elemento <vs> en XML');
        }

        // Extraer brillo (ac = actual brightness)
        const acElement = vs.querySelector('ac');
        const brightness = acElement ? parseInt(acElement.textContent) : 128;

        // Extraer colores primarios (cl = color)
        const clElements = vs.querySelectorAll('cl');
        const colors = Array.from(clElements).map(el => parseInt(el.textContent));

        // Extraer efecto (fx)
        const fxElement = vs.querySelector('fx');
        const fx = fxElement ? parseInt(fxElement.textContent) : 0;

        // Extraer paleta (fp)
        const fpElement = vs.querySelector('fp');
        const pal = fpElement ? parseInt(fpElement.textContent) : 0;

        // Determinar si está encendido (si hay brillo o si el XML lo indica)
        const isOn = brightness > 0;

        // Crear objeto compatible con handleWLEDState
        const state = {
            on: isOn,
            bri: brightness,
            seg: [{
                col: [colors.length >= 3 ? colors.slice(0, 3) : [255, 255, 255]],
                fx: fx,
                pal: pal
            }]
        };

        addDebugLog(`✅ Estado: ${isOn ? 'ON' : 'OFF'}, Brillo: ${brightness}, FX: ${fx}, Pal: ${pal}`, 'success');

        return state;
    } catch (e) {
        addDebugLog('❌ Error al parsear XML de WLED: ' + e.message, 'error');
        return null;
    }
}

// INICIO: Solución #5 - Nueva función para manejar el estado de WLED
function handleWLEDState(state) {
    if (!state) {
        addDebugLog('⚠️ Estado WLED recibido pero vacío', 'error');
        return;
    }

    // Si los LEDs no están listos, guardar el estado para aplicarlo después
    if (!ledsReady || ledMeshes.length === 0) {
        addDebugLog('⏳ LEDs no listos, guardando estado para aplicar después...', 'info');
        pendingWLEDState = state;
        return;
    }

    // Protección contra loops: evitar procesar el mismo estado múltiples veces
    const now = Date.now();
    const fx = state.seg?.[0]?.fx;
    const pal = state.seg?.[0]?.pal;
    const bri = state.bri;
    const stateSignature = `${fx}-${pal}-${bri}`;

    // Si es el mismo estado que acabamos de procesar hace menos de 800ms, ignorarlo
    if (stateSignature === lastProcessedState && (now - lastProcessedTime) < 800) {
        return; // Ignorar para evitar loop
    }

    lastProcessedState = stateSignature;
    lastProcessedTime = now;

    // 1. Actualizar Brillo
    if (typeof state.bri !== 'undefined') {
        const brightness = state.bri;

        // PRIMERA VEZ: Priorizar brillo guardado en localStorage
        if (!initialBrightnessSet) {
            const savedBrightness = localStorage.getItem('lastBrightness');
            if (savedBrightness) {
                const localBri = parseInt(savedBrightness);
                // Si el brillo guardado es diferente al de WLED (más de 2 puntos de diferencia)
                if (Math.abs(localBri - brightness) > 2) {
                    addDebugLog(`💡 Restaurando brillo guardado: ${localBri} (WLED tiene: ${brightness})`, 'info');
                    currentBrightness = localBri;
                    document.getElementById('brightness').value = localBri;
                    updateBrightnessLabel(localBri);

                    // Enviar el brillo guardado a WLED después de un segundo
                    setTimeout(() => {
                        sendMQTTCommand({"bri": localBri});
                        if (mqttClient && mqttClient.connected) {
                            mqttClient.publish('wled/tree/brightness', localBri.toString(), { retain: true });
                        }
                    }, 1000);

                    initialBrightnessSet = true;
                    return;
                }
            }
            initialBrightnessSet = true;
        }

        // SINCRONIZACIÓN NORMAL: Solo actualizar si hay diferencia significativa
        if (Math.abs(brightness - currentBrightness) > 2) {
            document.getElementById('brightness').value = brightness;
            updateBrightnessLabel(brightness);
            currentBrightness = brightness;

            // Guardar el brillo en localStorage para persistencia
            localStorage.setItem('lastBrightness', brightness.toString());

            // Publicar brillo en MQTT para sincronizar entre dispositivos
            if (mqttClient && mqttClient.connected) {
                mqttClient.publish('wled/tree/brightness', brightness.toString(), { retain: true });
            }
        }
    }

    // 2. Actualizar Estado (On/Off)
    const previousState = wledIsOn;
    wledIsOn = state.on === true; // Actualizar estado global
    wledStateReceived = true; // Marcamos que hemos recibido al menos un estado

    // Log cuando cambia el estado
    if (previousState !== wledIsOn) {
        addDebugLog(`💡 Estado WLED actualizado: ${wledIsOn ? 'Encendido' : 'Apagado'}`, 'info');
    }

    if (typeof state.on === 'undefined' || !state.on) {
        addDebugLog('⚫ Apagado', 'info');
        updateAllLEDsVisual('#000000');
        return; // Si está apagado, no procesar colores
    }

    // 3. Actualizar Colores y Efectos (basado en el primer segmento)
    if (state.seg && state.seg[0]) {
        const segment = state.seg[0];
        const fx = segment.fx;
        const pal = segment.pal;
        const col = segment.col[0] || [255, 0, 0]; // Color primario, con fallback

        // Sincronizar efecto y paleta actuales
        currentEffectId = fx;
        currentPaletteId = pal || 0;

        const hexColor = rgbToHex(col[0], col[1], col[2]);

        // Actualizar el picker de color de la UI
        selectedColor = hexColor;
        document.getElementById('ledColor').value = hexColor;

        // Detener cualquier animación local
        stopAllAnimations();

        if (fx === 0) {
            // --- Efecto Sólido ---
            addDebugLog(`🔄 Sincronizando: Color Sólido ${hexColor}`, 'info');
            updateAllLEDsVisual(hexColor);
        } else {
            // --- Efecto Animado ---
            addDebugLog(`🔄 Sincronizando: Efecto ${fx}, Paleta ${pal || 'default'}`, 'info');
            // Mostrar solo el color base - WLED maneja la animación real
            updateAllLEDsVisual(hexColor);
        }
    }
}
// FIN: Solución #5

// =====================================================
// ENVÍO DE COMANDOS MQTT
// =====================================================

async function sendMQTTCommand(payload) {
    if (!mqttClient || !mqttClient.connected) {
        addDebugLog('❌ No hay conexión MQTT', 'error');
        showStatus('❌ No conectado a MQTT', true);
        return false;
    }
    
    const payloadStr = JSON.stringify(payload);
    addDebugLog(`📤 Enviando comando: ${payloadStr.substring(0, 80)}...`, 'info');
    
    try {
        mqttClient.publish(MQTT_CONFIG.topic, payloadStr, { qos: 1, retain: false }, (err) => {
            if (err) {
                addDebugLog('❌ Error al publicar: ' + err.message, 'error');
             } else {
                addDebugLog('✅ Comando enviado correctamente', 'success');
            }
        });
        return true;
    } catch (error) {
        addDebugLog('❌ Excepción al publicar: ' + error.message, 'error');
        return false;
    }
}

async function sendTestMessage() {
    const testPayload = {
        "test": true,
        "timestamp": new Date().toISOString(),
        "message": "Test desde interfaz web"
     };
    
    addDebugLog('🧪 Enviando mensaje de prueba...', 'info');
    const success = await sendMQTTCommand(testPayload);
    
    if (success) {
        showStatus('✅ Mensaje de prueba enviado');
    }
}

// =====================================================
// FUNCIONES DE CONTROL (mantener todas las existentes)
// =====================================================

async function resetWLED() {
    stopAllAnimations();
    addDebugLog('🔴 Apagando LEDs...', 'info');
    
    await sendMQTTCommand({
        "on": false,
        "seg": [{
            "fx": 0,
            "sx": 0,
            "ix": 0,
            "pal": 0,
            "col": [[0,0,0]]
        }]
    });
    updateAllLEDsVisual('#000000');
    showStatus('✓ LEDs apagados');
}

function applyColorOrder(r, g, b) {
    switch(COLOR_ORDER) {
        case 'RGB':
            return [r, g, b];
        case 'GRB':
            return [g, r, b];
        case 'BGR':
            return [b, g, r];
        case 'RBG':
            return [r, b, g];
        case 'GBR':
            return [g, b, r];
        case 'BRG':
            return [b, r, g];
        default:
            return [r, g, b];
    }
}

// INICIO: Funciones de Diagnóstico Eliminadas
// testColorDirect, cycleColorTest, y testIndividualLEDs han sido eliminadas.
// FIN: Funciones de Diagnóstico Eliminadas

// CONTROL DE LEDS
function activatePaintMode() {
    paintMode = !paintMode;
    const btn = document.getElementById('paintBtn');
    const palette = document.getElementById('colorPalette');
    
    if (paintMode) {
        btn.classList.add('active');
        btn.textContent = 'Paint Mode: ON';
        palette.style.display = 'grid';
        showStatus('🎨 Paint Mode activado');
        addDebugLog('🎨 Paint Mode activado', 'info');
    } else {
        btn.classList.remove('active');
        btn.textContent = 'Activar Paint Mode';
        palette.style.display = 'none';
        showStatus('Paint Mode desactivado');
        addDebugLog('Paint Mode desactivado', 'info');
    }
}

function updateSelectedColor() {
    selectedColor = document.getElementById('ledColor').value;
    addDebugLog(`🎨 Color seleccionado: ${selectedColor}`, 'info');
}

function selectPaletteColor(color) {
    selectedColor = color;
    document.getElementById('ledColor').value = color;
    
    document.querySelectorAll('.palette-color').forEach(el => {
        el.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

async function updateLEDColor(index, color) {
    if (index < 0 || index >= totalLeds) return;
    ledColors[index] = color;
    updateLEDVisual(index, color, true);
    
    const rgb = hexToRgb(color);
    if (!rgb) return;
    
    const orderedRgb = applyColorOrder(rgb.r, rgb.g, rgb.b);
    await sendMQTTCommand({
        "on": true,
        "seg": [{
            "fx": 0,
            "i": [index, orderedRgb]
        }]
     });
}

function updateLEDVisual(index, color, needsUpdate = true) {
    if (index < 0 || index >= totalLeds || !ledMeshes[index]) return;
    const mesh = ledMeshes[index];
    mesh.material.color.set(color);
    
    if (needsUpdate) {
        mesh.material.needsUpdate = true;
    }
}

function updateAllLEDsVisual(color) {
    for (let i = 0; i < totalLeds; i++) {
        ledColors[i] = color;
        updateLEDVisual(i, color, false);
    }
    
    ledMeshes.forEach(mesh => {
        mesh.material.needsUpdate = true;
    });
}

// DISEÑOS ESTÁTICOS (mantener todas las funciones existentes)
function setStaticDesign(designName) {
    stopAllAnimations();
    currentEffect = designName;
    
    addDebugLog(`🎨 Aplicando diseño estático: ${designName}`, 'info');
    
    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    switch(designName) {
        case 'OFF':
            applyOFFDesign();
            break;
        case 'Solid':
            applySolidDesign();
            break;
        case 'Rainbow':
            applyRainbowDesign();
            break;
        case 'Warm':
            applyWarmDesign();
            break;
        case 'Cold':
            applyColdDesign();
            break;
        case 'Purple Rain':
            applyPurpleRainDesign();
            break;
        case 'Dominican':
            applyDominicanDesign();
            break;
    }
}

async function applyOFFDesign() {
    updateAllLEDsVisual('#000000');
    await sendMQTTCommand({ "on": false });
    showStatus('✓ LEDs apagados');
}

async function applySolidDesign() {
    updateAllLEDsVisual(selectedColor);
    const rgb = hexToRgb(selectedColor);
    
    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "seg": [{
            "id": 0,
            "fx": 0,
            "col": [applyColorOrder(rgb.r, rgb.g, rgb.b)]
        }]
    });
    showStatus(`✓ Solid ${selectedColor}`);
}

async function applyRainbowDesign(sendToWLED = true) {
    addDebugLog('🌈 Aplicando Rainbow', 'info');
    for (let i = 0; i < totalLeds; i++) {
        const hue = (i * 360 / totalLeds) % 360;
        const color = hslToRgb(hue, 100, 50);
        const hexColor = rgbToHex(color.r, color.g, color.b);
        updateLEDVisual(i, hexColor, false);
    }
    ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);

    if (sendToWLED) {
        await sendMQTTCommand({
            "on": true,
            "bri": currentBrightness,
            "seg": [{
                "id": 0,
                "fx": 9,
                "pal": 11
            }]
        });
    }
    showStatus('✓ Rainbow aplicado');
}

async function applyWarmDesign() {
    const warmColor = '#ffe4b5';
    updateAllLEDsVisual(warmColor);
    
    const rgb = hexToRgb(warmColor);
    
    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "seg": [{
            "id": 0,
            "fx": 0,
             "col": [applyColorOrder(rgb.r, rgb.g, rgb.b)]
        }]
    });
    showStatus('✓ Warm aplicado');
}

async function applyColdDesign() {
    addDebugLog('❄️ Aplicando Cold', 'info');
    const coldColors = ['#0066ff', '#00ccff', '#6600ff', '#00ffff', '#3366ff'];
    for (let i = 0; i < totalLeds; i++) {
        const colorHex = coldColors[i % coldColors.length];
        updateLEDVisual(i, colorHex, false);
    }
    ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "seg": [{
            "id": 0,
            "fx": 67,
            "pal": 9
        }]
    });
    showStatus('✓ Cold aplicado');
}

async function applyPurpleRainDesign() {
    const purpleColor = '#8b00ff';
    updateAllLEDsVisual(purpleColor);
    
    const rgb = hexToRgb(purpleColor);
    
    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "seg": [{
            "id": 0,
            "fx": 0,
             "col": [applyColorOrder(rgb.r, rgb.g, rgb.b)]
        }]
    });
    showStatus('✓ Purple Rain aplicado');
}

async function applyDominicanDesign() {
    addDebugLog('🇩🇴 Aplicando Dominican', 'info');
    const third = Math.floor(totalLeds / 3);
    
    for (let i = 0; i < totalLeds; i++) {
        let colorHex;
        if (i < third) {
            colorHex = '#0000ff';
        } else if (i < third * 2) {
            colorHex = '#ffffff';
        } else {
            colorHex = '#ff0000';
        }
        updateLEDVisual(i, colorHex, false);
    }
    ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "seg": [{
            "id": 0,
            "fx": 2,
            "pal": 255
        }]
    });
    showStatus('✓ Dominican aplicado 🇩🇴');
}

// EFECTOS ANIMADOS (mantener todas las funciones existentes)
function runAnimatedEffect(effectName, sendToWLED = true) {
    if (effectAnimationInterval) {
        clearInterval(effectAnimationInterval);
    }
    if (localAnimationInterval) {
        clearInterval(localAnimationInterval);
    }

    currentLocalAnimation = effectName;
    showStatus(`🔄 Animación "${effectName}" iniciada`);
    addDebugLog(`🎬 Iniciando animación: ${effectName}`, 'info');

    // Mapeo de efectos a sus números de FX, paletas y funciones de animación
    const effectMap = {
        'Fire': { fx: 45, pal: 35, animate: animateFire }, // Fire Flicker con Fire palette
        'Chase': { fx: 28, animate: animateChase },
        'Twinkle': { fx: 17, animate: animateTwinkle },
        'Sparkle': { fx: 20, animate: animateSparkle },
        'Ripple': { fx: 79, animate: animateRipple },
        'Blink': { fx: 1, animate: animateBlink },
        'Scan': { fx: 10, animate: animateScan },
        'Waves': { fx: 67, animate: animateWaves },
        'Fairy': { fx: 49, animate: animateFairy },
        'Flow': { fx: 110, animate: animateFlow }
    };

    const effect = effectMap[effectName];
    if (effect) {
        effect.animate();
        if (sendToWLED) {
            sendWLEDEffect(effect.fx, effect.pal || null);
        }
    }
}

async function sendWLEDEffect(fxNumber, paletteNumber = null) {
    const rgb = hexToRgb(selectedColor);
    const colorArray = applyColorOrder(rgb.r, rgb.g, rgb.b);

    const segmentConfig = {
        "id": 0,
        "fx": fxNumber,
        "col": [colorArray, [0, 0, 0], [0, 0, 0]]
    };

    // Add palette if specified
    if (paletteNumber !== null) {
        segmentConfig.pal = paletteNumber;
    }

    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "mainseg": 0,
        "seg": [segmentConfig]
    });
}

// Apply a color palette - mantiene el efecto actual y solo cambia la paleta
async function setPalette(paletteId) {
    addDebugLog(`🎨 Cambiando palette a: ${paletteId} (manteniendo efecto ${currentEffectId})`, 'info');

    // Guardar la paleta actual
    currentPaletteId = paletteId;

    // Definir colores base para paletas especiales
    const paletteBaseColors = {
        2: '#9B30FF',      // Purple Rain - morado vibrante
        6: '#FF1493',      // Party - magenta/rosa vibrante (rainbow sin verde)
        7: '#87CEEB',      // Cloud - azul cielo suave
        8: '#FF4500',      // Lava - naranja lava
        9: '#006994',      // Ocean - azul océano
        10: '#9ACD32',     // Forest - verde amarillento (yellow-green)
        11: '#FF0000',     // Rainbow - rojo inicial
        13: '#FF6347',     // Sunset - naranja/rojo atardecer
        20: '#FFB6C1',     // Pastel - rosa pastel suave
        26: '#20B2AA',     // Beach - teal/turquesa
        35: '#FF4500',     // Fire - naranja/rojo fuego
        48: '#E74C3C',     // C9 (Christmas) - rojo navideño
        50: '#00FF7F',     // Aurora - verde aurora boreal
        255: '#0038A8'     // Dominican - azul de la bandera
    };

    // Si la paleta tiene un color base definido, usarlo
    let colorToUse = selectedColor;
    if (paletteBaseColors[paletteId]) {
        colorToUse = paletteBaseColors[paletteId];
        selectedColor = colorToUse;
        document.getElementById('ledColor').value = colorToUse;
        addDebugLog(`🎨 Color base establecido a ${colorToUse} para palette ${paletteId}`, 'info');
    }

    const rgb = hexToRgb(colorToUse);
    const colorArray = applyColorOrder(rgb.r, rgb.g, rgb.b);

    // Aplicar la paleta con el efecto actual
    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "mainseg": 0,
        "seg": [{
            "id": 0,
            "fx": currentEffectId,
            "pal": paletteId,
            "col": [colorArray, [0, 0, 0], [0, 0, 0]]
        }]
    });

    // Si está en modo Solid (fx: 0), actualizar visualización inmediatamente
    if (currentEffectId === 0) {
        updateAllLEDsVisual(colorToUse);
    }

    showStatus(`✓ Palette ${paletteId} aplicada con efecto ${currentEffectId}`);
}

// Run an effect mode - usa la paleta actual
async function runEffect(fxId) {
    addDebugLog(`⚡ Aplicando efecto: fx=${fxId} con palette=${currentPaletteId}`, 'info');

    // Guardar el efecto actual
    currentEffectId = fxId;

    // Stop any local animations
    if (effectAnimationInterval) clearInterval(effectAnimationInterval);
    if (localAnimationInterval) clearInterval(localAnimationInterval);

    const rgb = hexToRgb(selectedColor);
    const colorArray = applyColorOrder(rgb.r, rgb.g, rgb.b);

    // Aplicar el efecto con la paleta actual
    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "mainseg": 0,
        "seg": [{
            "id": 0,
            "fx": fxId,
            "pal": currentPaletteId,
            "col": [colorArray, [0, 0, 0], [0, 0, 0]]
        }]
    });

    // Mostrar color base de la paleta en la visualización
    // Las animaciones reales las maneja WLED en el hardware
    // La visualización local solo muestra el color base para no confundir
    if (fxId === 0) {
        // Solid: mostrar el color seleccionado
        updateAllLEDsVisual(selectedColor);
    } else {
        // Efectos animados: mostrar color base de la paleta
        // WLED maneja la animación real en el hardware
        updateAllLEDsVisual(selectedColor);
    }

    showStatus(`✓ Effect ${fxId} aplicado con palette ${currentPaletteId}`);
}

// Helper to get effect name from ID
function getEffectName(fxId) {
    const effectNames = {
        1: 'Blink', 9: 'Rainbow', 10: 'Scan', 17: 'Twinkle', 20: 'Sparkle',
        28: 'Chase', 45: 'Fire', 67: 'Waves', 79: 'Ripple', 110: 'Flow'
    };
    return effectNames[fxId] || null;
}

// Helper to get animation function from ID
function getAnimationFunction(fxId) {
    const animations = {
        1: animateBlink, 10: animateScan, 17: animateTwinkle, 20: animateSparkle,
        28: animateChase, 45: animateFire, 67: animateWaves, 79: animateRipple, 110: animateFlow
    };
    return animations[fxId] || null;
}

function animateFire() {
    effectAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            const intensity = Math.random();
            const r = 255;
             const g = Math.floor(intensity * 150);
            const b = 0;
            const hexColor = rgbToHex(r, g, b);
            updateLEDVisual(i, hexColor, false);
         }
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
    }, 100);
}

function animateChase() {
    let pos = 0;
    effectAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            if (i % 10 === pos) {
                updateLEDVisual(i, selectedColor, false);
             } else {
                updateLEDVisual(i, '#000000', false);
            }
        }
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
         pos = (pos + 1) % 10;
    }, 100);
}

function animateTwinkle() {
    effectAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            if (Math.random() > 0.95) {
                updateLEDVisual(i, '#ffffff', false);
            } else {
                updateLEDVisual(i, selectedColor, false);
            }
        }
         ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
    }, 200);
}

function animateSparkle() {
    effectAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            updateLEDVisual(i, selectedColor, false);
        }
         const sparkleIndex = Math.floor(Math.random() * totalLeds);
        updateLEDVisual(sparkleIndex, '#ffffff', false);
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
    }, 100);
}

function animateRipple() {
    let offset = 0;
    effectAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            const distance = Math.abs(i - totalLeds/2);
            const wave = Math.sin((distance + offset) * 0.3) * 0.5 + 0.5;
             const rgb = hexToRgb(selectedColor);
            const hexColor = rgbToHex(
                Math.floor(rgb.r * wave),
                Math.floor(rgb.g * wave),
                 Math.floor(rgb.b * wave)
            );
            updateLEDVisual(i, hexColor, false);
        }
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
         offset += 1;
    }, 80);
}

function animateBlink() {
    let on = true;
    localAnimationInterval = setInterval(() => {
        if (on) {
            updateAllLEDsVisual(selectedColor);
        } else {
             updateAllLEDsVisual('#000000');
        }
        on = !on;
    }, 500);
}

function animateScan() {
    let currentLed = 0;
    localAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            if (i === currentLed) {
                updateLEDVisual(i, selectedColor, false);
            } else {
                updateLEDVisual(i, '#000000', false);
            }
        }
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
        
         currentLed = (currentLed + 1) % totalLeds;
    }, 50);
}

function animateWaves() {
    let offset = 0;
    localAnimationInterval = setInterval(() => {
        const rgb = hexToRgb(selectedColor);
        
        for (let i = 0; i < totalLeds; i++) {
            const wave = Math.sin((i + offset) * 0.2) * 0.5 + 0.5;
             const waveColor = rgbToHex(
                Math.floor(rgb.r * wave),
                Math.floor(rgb.g * wave),
                Math.floor(rgb.b * wave)
             );
            updateLEDVisual(i, waveColor, false);
        }
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
        
         offset += 1;
    }, 100);
}

function animateFairy() {
    localAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            if (Math.random() > 0.7) {
                 updateLEDVisual(i, selectedColor, false);
            } else {
                updateLEDVisual(i, '#000000', false);
            }
        }
         ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
    }, 200);
}

function animateFlow() {
    let hue = 0;
    localAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            const ledHue = (hue + (i * 360 / totalLeds)) % 360;
            const color = hslToRgb(ledHue, 100, 50);
             const hexColor = rgbToHex(color.r, color.g, color.b);
            updateLEDVisual(i, hexColor, false);
        }
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
        
        
        hue = (hue + 5) % 360;
    }, 100);
}

function stopAllAnimations() {
    if (effectAnimationInterval) {
        clearInterval(effectAnimationInterval);
        effectAnimationInterval = null;
    }
    if (localAnimationInterval) {
        clearInterval(localAnimationInterval);
        localAnimationInterval = null;
    }
    currentLocalAnimation = null;
    addDebugLog('⏹ Animación detenida', 'info');
    // No mostrar status aquí, es muy ruidoso
}

// BRILLO
let brightnessTimeout = null;
function setBrightness(value) {
    currentBrightness = parseInt(value);
    updateBrightnessLabel(value);

    // Guardar brillo en localStorage para persistencia local
    localStorage.setItem('lastBrightness', currentBrightness.toString());

    // No es necesario actualizar el visual aquí, WLED lo maneja

    if (brightnessTimeout) {
        clearTimeout(brightnessTimeout);
    }

    brightnessTimeout = setTimeout(() => {
        addDebugLog(`💡 Aplicando brillo: ${currentBrightness}`, 'info');
        sendMQTTCommand({"bri": currentBrightness});

        // Publicar brillo en MQTT para sincronizar entre dispositivos
        if (mqttClient && mqttClient.connected) {
            mqttClient.publish('wled/tree/brightness', currentBrightness.toString(), { retain: true });
        }
    }, 300); // 300ms debounce
}

function updateBrightnessLabel(value) {
    const percent = Math.round(value / 2.55);
    document.getElementById('brightVal').textContent = `${percent}%`;
}

// DISEÑOS GUARDADOS (mantener todas las funciones existentes)
function saveDesign() {
    const name = document.getElementById('designName').value.trim();
    if (!name) {
        showStatus('❌ Escribe un nombre para el diseño.', true);
        return;
    }
    
    const designToSave = {};
    for(const [index, color] of Object.entries(ledColors)) {
        if (color !== '#333333' && color !== '#000000') {
            designToSave[index] = color;
        }
    }

    if (Object.keys(designToSave).length === 0) {
         showStatus('❌ No hay LEDs encendidos para guardar.', true);
         return;
    }

    let designs = JSON.parse(localStorage.getItem('wledDesigns')) || {};
    designs[name] = designToSave;
    localStorage.setItem('wledDesigns', JSON.stringify(designs));
    
    showStatus(`✓ Diseño "${name}" guardado.`);
    addDebugLog(`💾 Diseño guardado: ${name}`, 'success');
    document.getElementById('designName').value = '';
    loadDesigns();
}

function loadDesigns() {
    const designs = JSON.parse(localStorage.getItem('wledDesigns')) ||
    {};
    const listDiv = document.getElementById('designsList');
    listDiv.innerHTML = '';
    
    if (Object.keys(designs).length === 0) {
        listDiv.innerHTML = '<p style="color: #666; font-size: 14px;">No hay diseños guardados.</p>';
        return;
    }
    
    Object.keys(designs).forEach(name => {
        const item = document.createElement('div');
        item.className = 'design-item';
        item.innerHTML = `
             <span>${escapeHTML(name)}</span>
            <div>
                <button onclick="applyDesign('${escapeHTML(name)}')">Cargar</button>
                <button class="delete-btn" onclick="deleteDesign('${escapeHTML(name)}')">X</button>
            </div>
         `;
        listDiv.appendChild(item);
    });
}

async function applyDesign(name) {
    const designs = JSON.parse(localStorage.getItem('wledDesigns')) ||
    {};
    const design = designs[name];
    
    if (!design) {
        showStatus('❌ No se encontró el diseño.', true);
        return;
    }

    stopAllAnimations();
    
    const payload_i = [];
    for (let i = 0; i < totalLeds; i++) {
        ledColors[i] = '#333333';
        updateLEDVisual(i, '#333333', false);
    }
    
    for(const [index, color] of Object.entries(design)) {
        const rgb = hexToRgb(color);
        const idx = parseInt(index);
        payload_i.push(idx, [rgb.r, rgb.g, rgb.b]);
        
        ledColors[idx] = color;
        updateLEDVisual(idx, color, false);
    }
    
    ledMeshes.forEach(mesh => {
        mesh.material.needsUpdate = true;
    });
    await sendMQTTCommand({
        "on": true,
        "seg": [{ "fx": 0, "i": payload_i }]
    });
    showStatus(`✓ Diseño "${name}" cargado.`);
    addDebugLog(`📂 Diseño cargado: ${name}`, 'success');
}

function deleteDesign(name) {
    if (!confirm(`¿Seguro que quieres borrar el diseño "${name}"?`)) {
        return;
    }
    let designs = JSON.parse(localStorage.getItem('wledDesigns')) || {};
    delete designs[name];
    localStorage.setItem('wledDesigns', JSON.stringify(designs));
    showStatus(`✓ Diseño "${name}" borrado.`);
    addDebugLog(`🗑️ Diseño eliminado: ${name}`, 'info');
    loadDesigns();
}

// THREE.JS (mantener todas las funciones existentes)
function initThreeJS() {
    const canvas = document.getElementById('treeCanvas');
    scene = new THREE.Scene();
    scene.background = null;
    
    camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 8, 25);
    camera.lookAt(0, 8, 0);
    
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(0, 25, 20);
    scene.add(pointLight);
    
    createChristmasTree();
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    canvas.addEventListener('mousedown', () => {
        isDragging = true;
    });
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaMove = {
                x: e.offsetX - previousMousePosition.x,
                y: e.offsetY - previousMousePosition.y
             };
            
            ledGroup.rotation.y += deltaMove.x * 0.01;
            ledGroup.rotation.x += deltaMove.y * 0.01;
         }
        
        previousMousePosition = {
            x: e.offsetX,
            y: e.offsetY
        };
     });
    
    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });
    canvas.addEventListener('click', onCanvasClick);
    
    window.addEventListener('resize', onWindowResize);
    
    animate();
}

function createStarShape() {
    const shape = new THREE.Shape();
    const outerRadius = 0.5;  // Reducido de 0.8 a 0.5
    const innerRadius = 0.2;  // Reducido de 0.35 a 0.2
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    shape.closePath();
    return shape;
}

function createChristmasTree() {
    ledGroup = new THREE.Group();
    const treeHeight = 17;
    const treeRadius = 7;
    const treeGeometry = new THREE.ConeGeometry(treeRadius, treeHeight, 32);
    const treeMaterial = new THREE.MeshPhongMaterial({
        color: 0x0a4d0a,
        transparent: true,
        opacity: 0.7
    });
    const treeMesh = new THREE.Mesh(treeGeometry, treeMaterial);
    treeMesh.position.y = treeHeight / 2;
    ledGroup.add(treeMesh);

    // Create 3D star for tree top
    const starShape = createStarShape();
    const extrudeSettings = {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 2
    };
    const starGeometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    const starMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffdd00,
        emissiveIntensity: 0.4,
        shininess: 100,
        specular: 0xffffff
    });
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);

    // Position star vertically on tree top
    starMesh.position.y = treeHeight + 0.8;  // Ajustado de 0.5 a 0.8
    starMesh.position.x = 0;
    starMesh.position.z = 0;
    // Rotar ligeramente para dar más dinamismo
    starMesh.rotation.y = Math.PI / 10;  // Pequeña rotación en Y
    starMesh.rotation.z = 0;             // Sin inclinación

    ledGroup.add(starMesh);
    const ledsPerLayer = 9;
    const layers = Math.ceil(totalLeds / ledsPerLayer);
    
    let ledIndex = 0;
    for (let layer = 0; layer < layers && ledIndex < totalLeds; layer++) {
        const ledsInThisLayer = Math.min(ledsPerLayer, totalLeds - ledIndex);
        for (let i = 0; i < ledsInThisLayer; i++) {
            const angleOffset = (i / ledsInThisLayer) * (Math.PI * 2);
            const y = (layer / layers) * treeHeight;
            const radiusAtHeight = treeRadius * (1 - (y / treeHeight));
            const spiralOffset = layer * 0.4;
            const x = Math.cos(angleOffset + spiralOffset) * radiusAtHeight;
            const z = Math.sin(angleOffset + spiralOffset) * radiusAtHeight;
            
            const ledGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const ledMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
            const ledMesh = new THREE.Mesh(ledGeometry, ledMaterial);
            
            ledMesh.position.set(x, y, z);
            ledMesh.userData.ledIndex = ledIndex;
            ledGroup.add(ledMesh);
            ledMeshes.push(ledMesh);
            ledColors[ledIndex] = '#333333';
            ledPositions[ledIndex] = { x, y, z };
            
            ledIndex++;
        }
    }

    scene.add(ledGroup);

    // Marcar que los LEDs están listos
    ledsReady = true;
    addDebugLog(`✅ ${totalLeds} LEDs creados y listos`, 'success');

    // Aplicar estado pendiente de WLED si existe
    if (pendingWLEDState) {
        addDebugLog('🔄 Aplicando estado pendiente de WLED...', 'info');
        handleWLEDState(pendingWLEDState);
        pendingWLEDState = null;
    }
}

function onCanvasClick(event) {
    if (!paintMode) return;
    const canvas = document.getElementById('treeCanvas');
    const rect = canvas.getBoundingClientRect();
    
    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(ledMeshes);
    if (intersects.length > 0) {
        const clickedLED = intersects[0].object;
        const ledIndex = clickedLED.userData.ledIndex;
        
        updateLEDColor(ledIndex, selectedColor);
    }
}

function animate() {
    requestAnimationFrame(animate);
    ledGroup.rotation.y += 0.001;
    renderer.render(scene, camera);
}

function onWindowResize() {
    const canvas = document.getElementById('treeCanvas');
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}

// UTILIDADES (mantener todas las funciones existentes)
function generateStars() {
    const starsContainer = document.getElementById('stars');
    for(let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 3 + 's';
        starsContainer.appendChild(star);
    }
}

function showStatus(message, isError = false) {
    const oldMessage = document.querySelector('.status-message');
    if (oldMessage) oldMessage.remove();
    
    const status = document.createElement('div');
    status.className = 'status-message';
    status.textContent = message;
    if (isError) {
        status.style.background = '#dc3545';
    }
    document.body.appendChild(status);
    setTimeout(() => {
        status.remove();
    }, 3000);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
        r: Math.round(255 * f(0)),
        g: Math.round(255 * f(8)),
        b: Math.round(255 * f(4))
    };
}

function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

// =====================================================
// INICIALIZACIÓN
// =====================================================

// Initialize Supabase client (must be called after SDK loads)
function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized');
        return true;
    } else {
        console.error('❌ Supabase SDK not loaded');
        return false;
    }
}

window.onload = function() {
    if (!initSupabase()) {
        console.error('Failed to initialize Supabase');
        document.getElementById('authError').textContent = 'Error: No se pudo cargar el sistema de autenticación';
        document.getElementById('authError').classList.add('show');
        return;
    }

    // SINGLE SOURCE OF TRUTH for auth state
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event, 'Session:', session ? 'exists' : 'null');

        if (session && session.user) {
            currentUser = session.user;
            document.getElementById('authOverlay').style.display = 'none';
            document.getElementById('authOverlay').classList.add('hidden');
            updateUserInfo(session.user);
            console.log('✅ User authenticated:', session.user.email);

            // Verify user limit on new sign-ins
            if (event === 'SIGNED_IN') {
                try {
                    const { data: userCount, error: countError } = await supabaseClient.rpc('count_registered_users');
                    if (!countError && userCount > 3) {
                        await supabaseClient.auth.signOut();
                        showAuthError('🚫 Límite de usuarios alcanzado.');
                        return;
                    }
                } catch (e) {
                    console.error('Error verificando límite:', e);
                }
            }
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            document.getElementById('authOverlay').style.display = 'flex';
            document.getElementById('authOverlay').classList.remove('hidden');
            hideUserInfo();
            console.log('👋 User signed out');
        }

        if (event === 'PASSWORD_RECOVERY') {
            const newPassword = prompt('Ingresa tu nueva contraseña:');
            if (newPassword) {
                const passwordCheck = checkPasswordStrength(newPassword);
                if (passwordCheck.valid) {
                    supabaseClient.auth.updateUser({ password: newPassword })
                        .then(() => alert('Contraseña actualizada exitosamente'))
                        .catch(err => alert('Error: ' + err.message));
                } else {
                    alert('La contraseña no es lo suficientemente fuerte');
                }
            }
        }

        authInitialized = true;
    });

    // FALLBACK: If onAuthStateChange doesn't fire within 3s, check manually ONCE
    setTimeout(async () => {
        if (!authInitialized) {
            console.log('⏰ Fallback auth check...');
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session && session.user) {
                    currentUser = session.user;
                    document.getElementById('authOverlay').style.display = 'none';
                    updateUserInfo(session.user);
                } else {
                    document.getElementById('authOverlay').style.display = 'flex';
                    hideUserInfo();
                }
            } catch (e) {
                document.getElementById('authOverlay').style.display = 'flex';
                hideUserInfo();
            }
            authInitialized = true;
        }
    }, 3000);

    // DELETE these lines (remove checkAuthSession call and the backup setTimeout at 1500ms):
    // checkAuthSession();                    ← REMOVE
    // setTimeout(async () => { ... }, 1500); ← REMOVE

    addDebugLog('🚀 Aplicación iniciada', 'success');
    addDebugLog('📝 Versión completa con Scheduler', 'info');

    // Cargar último brillo conocido desde localStorage
    const savedBrightness = localStorage.getItem('lastBrightness');
    if (savedBrightness) {
        const brightness = parseInt(savedBrightness);
        currentBrightness = brightness;
        document.getElementById('brightness').value = brightness;
        updateBrightnessLabel(brightness);
        addDebugLog(`💡 Brillo restaurado: ${brightness}`, 'info');
    }

    initThreeJS();
    generateStars();
    loadDesigns();
    loadSchedules();
    loadTimezone(); // Cargar zona horaria guardada
    
    // PRIMERO establecer conexión MQTT
    setTimeout(() => {
        initMQTT();
    }, 500);
    
    // DESPUÉS iniciar verificación de horarios (solo si hay conexión)
    setTimeout(() => {
        // Verificar horarios cada 20 segundos para mayor precisión
        schedulerInterval = setInterval(() => {
            checkSchedules();
        }, 20000);

        // Primera verificación inmediata después de iniciar
        setTimeout(() => {
            checkSchedules();
        }, 3000);
    }, 2000);

    // Backup auth UI check after everything loads
    setTimeout(async () => {
        console.log('🔍 Running backup auth UI check...');
        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                console.log('✅ Backup check: User is logged in, ensuring UI is updated');
                updateUserInfo(session.user);
            } else {
                console.log('ℹ️ Backup check: No session, showing login');
                hideUserInfo();
            }
        } catch (e) {
            console.error('❌ Backup auth check failed:', e);
        }
    }, 1500);
};
