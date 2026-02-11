// =====================================================
// AUTHENTICATION - Login, Register, Session Management
// =====================================================

// Detect which page we're on
const isLoginPage = window.location.pathname.endsWith('login.html');

// =====================================================
// AUTH TAB SWITCHING
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
        strengthText.textContent = 'Débil: ' + feedback.join(', ');
        return { strength: 'weak', valid: false };
    } else if (strength <= 4) {
        strengthFill.classList.add('medium');
        strengthText.textContent = 'Media: ' + (feedback.length > 0 ? feedback.join(', ') : 'Añade símbolos para mayor seguridad');
        return { strength: 'medium', valid: true };
    } else {
        strengthFill.classList.add('strong');
        strengthText.textContent = 'Fuerte: Contraseña segura';
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
        showAuthError('Las contraseñas no coinciden');
        return;
    }

    const passwordCheck = checkPasswordStrength(password);
    if (!passwordCheck.valid) {
        showAuthError('La contraseña no es lo suficientemente fuerte');
        return;
    }

    const button = document.getElementById('registerButton');
    button.disabled = true;
    button.innerHTML = '<span class="auth-loading"></span> Creando cuenta...';

    try {
        const { data: userCount, error: countError } = await supabaseClient.rpc('count_registered_users');

        if (countError) {
            showAuthError('Error al verificar disponibilidad.');
            button.disabled = false;
            button.textContent = 'Crear Cuenta';
            return;
        }

        if (userCount >= 3) {
            showAuthError('Límite de usuarios alcanzado. Solo se permiten 3 usuarios registrados.');
            button.disabled = false;
            button.textContent = 'Crear Cuenta';
            return;
        }
    } catch (e) {
        showAuthError('Error al verificar disponibilidad.');
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
            showAuthSuccess('Cuenta creada! Revisa tu correo para confirmar tu cuenta.');
        } else {
            showAuthSuccess('Cuenta creada exitosamente!');
            setTimeout(() => switchAuthTab('login'), 2000);
        }

        document.getElementById('registerForm').reset();
        document.getElementById('passwordStrength').classList.remove('show');

    } catch (error) {
        showAuthError(error.message || 'Error al crear la cuenta');
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
            showAuthSuccess('Bienvenido de vuelta!');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }

    } catch (error) {
        if (error.message.includes('Email not confirmed')) {
            showAuthError('Por favor, confirma tu correo electrónico antes de iniciar sesión');
        } else if (error.message.includes('Invalid login credentials')) {
            showAuthError('Correo o contraseña incorrectos');
        } else {
            showAuthError(error.message || 'Error al iniciar sesión');
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
    window.location.href = 'login.html';
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
        showAuthSuccess('Se ha enviado un enlace de recuperación a tu correo');
    } catch (error) {
        showAuthError(error.message || 'Error al enviar el correo');
    }
}

// =====================================================
// OAUTH LOGIN
// =====================================================

async function handleOAuthLogin(provider) {
    hideAuthMessages();

    try {
        const redirectUrl = window.location.origin + '/index.html';
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: provider,
            options: { redirectTo: redirectUrl }
        });
        if (error) throw error;
    } catch (error) {
        showAuthError(error.message || 'Error al iniciar sesión con ' + provider);
    }
}

// =====================================================
// SESSION CHECK ON PAGE LOAD
// =====================================================

function showProtectedPage() {
    document.body.style.visibility = '';
}

function initAuth() {
    if (!initSupabase()) {
        // Supabase SDK not loaded — redirect protected pages to login
        if (!isLoginPage) {
            window.location.href = 'login.html';
        }
        return;
    }

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user) {
            currentUser = session.user;

            if (isLoginPage) {
                window.location.href = 'index.html';
            } else {
                updateUserInfo(session.user);
                showProtectedPage();
            }
        } else {
            if (!isLoginPage) {
                window.location.href = 'login.html';
            }
        }
        authInitialized = true;
    }).catch(() => {
        if (!isLoginPage) {
            window.location.href = 'login.html';
        }
        authInitialized = true;
    });

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

// Run auth check as soon as possible
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
