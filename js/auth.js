// =====================================================
// SUPABASE CONFIG
// =====================================================

const SUPABASE_URL = 'https://mcwsdinbxwfomkgtolhf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jd3NkaW5ieHdmb21rZ3RvbGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjU2MzcsImV4cCI6MjA3ODI0MTYzN30.rjJpb2OQRui-1uIsn2VwE_zX-I5V2CKgM3MveZSXxW4';

let supabaseClient = null;
let currentUser = null;
let authInitialized = false;

// Detect which page we're on
const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    }
    return false;
}

// =====================================================
// AUTH TAB SWITCHING (login page only)
// =====================================================

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    if (tab === 'login') {
        document.querySelector('.auth-tab:first-child').classList.add('active');
        document.getElementById('loginForm').classList.add('active');
    } else {
        document.querySelector('.auth-tab:last-child').classList.add('active');
        document.getElementById('registerForm').classList.add('active');
    }

    hideAuthMessages();
}

// =====================================================
// PASSWORD VALIDATION
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

    if (password.length >= 8) strength++;
    else feedback.push('Mínimo 8 caracteres');

    if (password.length >= 12) strength++;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    else feedback.push('Mayúsculas y minúsculas');

    if (/[0-9]/.test(password)) strength++;
    else feedback.push('Al menos un número');

    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    else feedback.push('Al menos un símbolo (!@#$%^&*)');

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
// AUTH MESSAGES
// =====================================================

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    if (!errorDiv) return;
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}

function showAuthSuccess(message) {
    const successDiv = document.getElementById('authSuccess');
    if (!successDiv) return;
    successDiv.textContent = message;
    successDiv.classList.add('show');
    setTimeout(() => successDiv.classList.remove('show'), 5000);
}

function hideAuthMessages() {
    const err = document.getElementById('authError');
    const suc = document.getElementById('authSuccess');
    if (err) err.classList.remove('show');
    if (suc) suc.classList.remove('show');
}

// =====================================================
// REGISTER
// =====================================================

async function handleRegister(event) {
    event.preventDefault();
    hideAuthMessages();

    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    if (password !== passwordConfirm) {
        showAuthError('❌ Las contraseñas no coinciden');
        return;
    }

    const passwordCheck = checkPasswordStrength(password);
    if (!passwordCheck.valid) {
        showAuthError('❌ La contraseña no es lo suficientemente fuerte');
        return;
    }

    const button = document.getElementById('registerButton');
    button.disabled = true;
    button.innerHTML = '<span class="auth-loading"></span> Creando cuenta...';

    // Verify user limit (max 3)
    try {
        const { data: userCount, error: countError } = await supabaseClient.rpc('count_registered_users');

        if (countError) {
            showAuthError('❌ Error al verificar disponibilidad.');
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
        showAuthError('❌ Error al verificar disponibilidad.');
        button.disabled = false;
        button.textContent = 'Crear Cuenta';
        return;
    }

    try {
        const currentUrl = window.location.origin + window.location.pathname;

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: { emailRedirectTo: currentUrl }
        });

        if (error) throw error;

        if (data.user && !data.user.confirmed_at) {
            showAuthSuccess('✅ Cuenta creada! Revisa tu correo para confirmar tu cuenta.');
        } else {
            showAuthSuccess('✅ Cuenta creada exitosamente!');
            setTimeout(() => switchAuthTab('login'), 2000);
        }

        document.getElementById('registerForm').reset();
        document.getElementById('passwordStrength').classList.remove('show');

    } catch (error) {
        showAuthError('❌ ' + (error.message || 'Error al crear la cuenta'));
    } finally {
        button.disabled = false;
        button.textContent = 'Crear Cuenta';
    }
}

// =====================================================
// LOGIN
// =====================================================

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
            currentUser = data.user;
            showAuthSuccess('✅ Bienvenido de vuelta!');

            // Redirect to tree page after login
            setTimeout(() => {
                window.location.href = 'tree.html';
            }, 1000);
        }

    } catch (error) {
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

// =====================================================
// LOGOUT
// =====================================================

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
    } catch (e) {}
    currentUser = null;
    window.location.href = 'index.html';
}

// =====================================================
// FORGOT PASSWORD
// =====================================================

async function handleForgotPassword() {
    const email = prompt('Ingresa tu correo electrónico para recuperar tu contraseña:');
    if (!email) return;

    try {
        const currentUrl = window.location.origin + window.location.pathname;
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: currentUrl
        });
        if (error) throw error;
        showAuthSuccess('✅ Se ha enviado un enlace de recuperación a tu correo');
    } catch (error) {
        showAuthError('❌ ' + (error.message || 'Error al enviar el correo'));
    }
}

// =====================================================
// OAUTH LOGIN
// =====================================================

async function handleOAuthLogin(provider) {
    hideAuthMessages();

    try {
        const redirectUrl = window.location.origin + '/tree.html';
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: { redirectTo: redirectUrl }
        });
        if (error) throw error;
    } catch (error) {
        showAuthError('❌ ' + (error.message || 'Error al iniciar sesión con ' + provider));
    }
}

// =====================================================
// NAV USER DROPDOWN
// =====================================================

function toggleUserDropdown() {
    document.getElementById('navDropdownMenu').classList.toggle('show');
}

function closeUserDropdown() {
    document.getElementById('navDropdownMenu').classList.remove('show');
}

document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('navUserDropdown');
    if (dropdown && !dropdown.contains(e.target)) {
        closeUserDropdown();
    }
});

// =====================================================
// UPDATE UI FOR AUTH STATE
// =====================================================

function updateUserInfo(user) {
    if (!user || !user.email) return;

    // Update sidebar info (tree page only)
    const userEmailEl = document.getElementById('userEmail');
    const userInfoEl = document.getElementById('userInfo');
    if (userEmailEl) userEmailEl.textContent = user.email;
    if (userInfoEl) userInfoEl.style.display = 'block';

    // Update nav bar
    const navAuthButtons = document.getElementById('navAuthButtons');
    const navUserDropdown = document.getElementById('navUserDropdown');
    const navUserName = document.getElementById('navUserName');

    if (navAuthButtons) navAuthButtons.style.cssText = 'display: none !important;';
    if (navUserDropdown) navUserDropdown.style.cssText = 'display: flex !important; position: relative;';
    if (navUserName) navUserName.textContent = user.email.split('@')[0];
}

function hideUserInfo() {
    const userInfoEl = document.getElementById('userInfo');
    if (userInfoEl) userInfoEl.style.display = 'none';

    const navAuthButtons = document.getElementById('navAuthButtons');
    const navUserDropdown = document.getElementById('navUserDropdown');

    if (navAuthButtons) navAuthButtons.style.cssText = 'display: flex !important;';
    if (navUserDropdown) navUserDropdown.style.cssText = 'display: none !important;';
}

// =====================================================
// SESSION CHECK ON PAGE LOAD
// =====================================================

function initAuth() {
    if (!initSupabase()) return;

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
            currentUser = session.user;

            if (isLoginPage) {
                // Already logged in, redirect to tree
                window.location.href = 'tree.html';
            } else {
                updateUserInfo(session.user);
            }
        } else {
            if (!isLoginPage) {
                // Not logged in, redirect to login
                window.location.href = 'index.html';
            }
        }
        authInitialized = true;
    }).catch(() => {
        if (!isLoginPage) {
            window.location.href = 'index.html';
        }
        authInitialized = true;
    });

    // Listen for auth state changes
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            updateUserInfo(session.user);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            hideUserInfo();
        }
    });
}

// Auto-initialize on page load
window.addEventListener('DOMContentLoaded', initAuth);
