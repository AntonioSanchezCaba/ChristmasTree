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

window.addEventListener('DOMContentLoaded', function () {
    tick();
    setInterval(tick, 1000);
    setTimeout(sim, 1500);
    setInterval(sim, 5000);
});
