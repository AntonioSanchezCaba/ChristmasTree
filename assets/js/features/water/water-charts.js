// =====================================================
// WATER TANK - Chart Tab Switching
// =====================================================

function setTab(btn) {
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
}
