// =====================================================
// NAVIGATION - Dropdown, User Info Display
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
// USER INFO UI
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
