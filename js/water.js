// =====================================================
// SUPABASE CONFIG
// =====================================================

const SUPABASE_URL = 'https://mcwsdinbxwfomkgtolhf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jd3NkaW5ieHdmb21rZ3RvbGhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjU2MzcsImV4cCI6MjA3ODI0MTYzN30.rjJpb2OQRui-1uIsn2VwE_zX-I5V2CKgM3MveZSXxW4';

let supabaseClient = null;
let currentUser = null;
let authInitialized = false;

function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    }
    return false;
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

document.addEventListener('click', e => {
    const d = document.getElementById('navUserDropdown');
    if (d && !d.contains(e.target)) closeUserDropdown();
});

function updateUserInfo(user) {
    if (!user || !user.email) return;

    const authButtons = document.getElementById('navAuthButtons');
    const userDropdown = document.getElementById('navUserDropdown');
    const userName = document.getElementById('navUserName');

    if (authButtons) authButtons.style.cssText = 'display:none!important;';
    if (userDropdown) userDropdown.style.cssText = 'display:flex!important;position:relative;';
    if (userName) userName.textContent = user.email.split('@')[0];
}

function hideUserInfo() {
    const authButtons = document.getElementById('navAuthButtons');
    const userDropdown = document.getElementById('navUserDropdown');

    if (authButtons) authButtons.style.cssText = 'display:flex!important;';
    if (userDropdown) userDropdown.style.cssText = 'display:none!important;';
}

async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
    } catch (e) {}
    currentUser = null;
    hideUserInfo();
    window.location.href = 'index.html';
}

// =====================================================
// CLOCK
// =====================================================

function tick() {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString('en-US', {
        timeZone: 'America/Santo_Domingo',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

// =====================================================
// TANK SIMULATION
// =====================================================

let t1Level = 78;
let t2Level = 62;

function sim() {
    t1Level = Math.max(5, Math.min(98, t1Level + (Math.random() - 0.45) * 1.8));
    t2Level = Math.max(5, Math.min(98, t2Level + (Math.random() - 0.52) * 2));

    const r1 = Math.round(t1Level);
    const r2 = Math.round(t2Level);

    // Update tank fill levels
    document.getElementById('t1-fill').style.height = r1 + '%';
    document.getElementById('t2-fill').style.height = r2 + '%';

    // Update percentage displays
    document.getElementById('t1-pct').innerHTML = r1 + '<span>%</span>';
    document.getElementById('t2-pct').innerHTML = r2 + '<span>%</span>';
    document.getElementById('ov-t1').innerHTML = r1 + '<span>%</span>';
    document.getElementById('ov-t2').innerHTML = r2 + '<span>%</span>';

    // Update volume displays
    const v1 = Math.round(r1 / 100 * 1100);
    const v2 = Math.round(r2 / 100 * 1100);
    document.getElementById('t1-vol').textContent = 'Current: ' + v1 + ' L';
    document.getElementById('t2-vol').textContent = 'Current: ' + v2 + ' L';
    document.getElementById('t1-vol-bar').style.width = r1 + '%';
    document.getElementById('t2-vol-bar').style.width = r2 + '%';

    // Randomize flow rates
    const s1 = (2 + Math.random() * 1.5).toFixed(1);
    const c1 = (1.2 + Math.random() * 1.2).toFixed(1);
    const s2 = (1.5 + Math.random() * 1.5).toFixed(1);
    const c2 = (1.5 + Math.random() * 1.3).toFixed(1);

    document.getElementById('t1-sup-val').innerHTML = s1 + '<span> L/min</span>';
    document.getElementById('t1-con-val').innerHTML = c1 + '<span> L/min</span>';
    document.getElementById('t2-sup-val').innerHTML = s2 + '<span> L/min</span>';
    document.getElementById('t2-con-val').innerHTML = c2 + '<span> L/min</span>';

    // Update flow rate bars
    document.getElementById('t1-sup-bar').style.width = (s1 / 5 * 100) + '%';
    document.getElementById('t1-con-bar').style.width = (c1 / 5 * 100) + '%';
    document.getElementById('t2-sup-bar').style.width = (s2 / 5 * 100) + '%';
    document.getElementById('t2-con-bar').style.width = (c2 / 5 * 100) + '%';

    // Update temperatures
    document.getElementById('t1-temp').innerHTML = (24 + Math.random() * 1.5).toFixed(1) + '<span> °C</span>';
    document.getElementById('t2-temp').innerHTML = (24.5 + Math.random() * 1.5).toFixed(1) + '<span> °C</span>';

    // Update timestamps
    document.getElementById('t1-ts').textContent = 'Updated just now';
    document.getElementById('t2-ts').textContent = 'Updated just now';
}

// =====================================================
// CHART TABS
// =====================================================

function setTab(btn) {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
}

// =====================================================
// INITIALIZATION
// =====================================================

window.onload = function () {
    if (!initSupabase()) return;

    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            currentUser = session.user;
            updateUserInfo(session.user);
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            hideUserInfo();
        }
        authInitialized = true;
    });

    // Fallback: check session after 3s if auth state hasn't fired
    setTimeout(async () => {
        if (!authInitialized) {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session && session.user) {
                    currentUser = session.user;
                    updateUserInfo(session.user);
                } else {
                    hideUserInfo();
                }
            } catch (e) {
                hideUserInfo();
            }
            authInitialized = true;
        }
    }, 3000);

    // Start clock and simulation
    tick();
    setInterval(tick, 1000);
    setTimeout(sim, 1500);
    setInterval(sim, 5000);
};
