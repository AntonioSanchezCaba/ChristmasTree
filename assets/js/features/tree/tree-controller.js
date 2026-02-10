// =====================================================
// TREE CONTROLLER - Schedule, Paint, Brightness, Designs, Init
// =====================================================

// ===== SCHEDULE MODAL =====

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
    modal.classList.add('closing');

    setTimeout(() => {
        modal.classList.remove('active');
        modal.classList.remove('closing');
    }, 300);
}

// ===== SCHEDULE SYSTEM =====

function loadSchedules() {
    try {
        const savedSchedules = localStorage.getItem('wledSchedules');
        if (savedSchedules && savedSchedules !== 'undefined') {
            schedules = JSON.parse(savedSchedules);
            addDebugLog(schedules.length + ' horarios cargados desde localStorage', 'info');
        } else {
            const backup = localStorage.getItem('wledSchedules_backup');
            if (backup && backup !== 'undefined') {
                const backupData = JSON.parse(backup);
                schedules = backupData.schedules || [];
                addDebugLog(schedules.length + ' horarios recuperados desde respaldo', 'info');
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
        addDebugLog('Error al cargar horarios: ' + e.message, 'error');
        schedules = [];
    }
}

function saveSchedules() {
    try {
        const schedulesJson = JSON.stringify(schedules);
        localStorage.setItem('wledSchedules', schedulesJson);

        const backup = {
            schedules: schedules,
            enabled: document.getElementById('schedulerEnabled')?.checked || false,
            timezone: userTimezone,
            lastSaved: new Date().toISOString()
        };
        localStorage.setItem('wledSchedules_backup', JSON.stringify(backup));

        renderScheduleGrid();

        if (mqttClient && mqttClient.connected) {
            const schedulesData = {
                schedules: schedules,
                enabled: document.getElementById('schedulerEnabled').checked,
                timezone: userTimezone,
                timestamp: Date.now()
            };
            mqttClient.publish('wled/tree/schedules', JSON.stringify(schedulesData), { retain: true });
            addDebugLog('Horarios guardados y publicados', 'success');
        }
    } catch (e) {
        console.error('Error al guardar horarios:', e);
        addDebugLog('Error al guardar horarios: ' + e.message, 'error');
    }
}

function addSchedule() {
    const selectedDays = [];
    for (let i = 0; i < 7; i++) {
        if (document.getElementById('day-' + i).checked) {
            selectedDays.push(i);
        }
    }

    if (selectedDays.length === 0) {
        showStatus('Selecciona al menos un día', true);
        return;
    }

    const startTime = document.getElementById('scheduleStartTime').value;
    const endTime = document.getElementById('scheduleEndTime').value;

    if (!startTime || !endTime) {
        showStatus('Define las horas de inicio y fin', true);
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

    for (let i = 0; i < 7; i++) {
        document.getElementById('day-' + i).checked = false;
    }
    document.getElementById('scheduleStartTime').value = '07:00';
    document.getElementById('scheduleEndTime').value = '21:00';
    showStatus('Horario agregado correctamente');
    addDebugLog('Nuevo horario agregado', 'success');
}

function deleteSchedule(id) {
    schedules = schedules.filter(s => s.id !== id);
    saveSchedules();
    showStatus('Horario eliminado');
    addDebugLog('Horario eliminado', 'info');
}

function toggleSchedule(id) {
    const schedule = schedules.find(s => s.id === id);
    if (schedule) {
        schedule.enabled = !schedule.enabled;
        saveSchedules();
        addDebugLog('Horario ' + (schedule.enabled ? 'activado' : 'desactivado'), 'info');
    }
}

function renderScheduleGrid() {
    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = '';

    for (let day = 0; day < 7; day++) {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column';

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = DAYS_SHORT[day];

        const daySchedule = document.createElement('div');
        daySchedule.className = 'day-schedule';

        schedules.forEach(schedule => {
            const [startH, startM] = schedule.startTime.split(':').map(Number);
            const [endH, endM] = schedule.endTime.split(':').map(Number);

            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;
            const isOvernight = endMinutes < startMinutes;

            if (!isOvernight) {
                if (schedule.days.includes(day)) {
                    daySchedule.appendChild(createScheduleBlock(schedule, startMinutes, endMinutes));
                }
            } else {
                if (schedule.days.includes(day)) {
                    daySchedule.appendChild(createScheduleBlock(schedule, startMinutes, 1440));
                }
                const prevDay = (day === 0) ? 6 : day - 1;
                if (schedule.days.includes(prevDay)) {
                    daySchedule.appendChild(createScheduleBlock(schedule, 0, endMinutes));
                }
            }
        });

        dayColumn.appendChild(dayHeader);
        dayColumn.appendChild(daySchedule);
        grid.appendChild(dayColumn);
    }
}

function createScheduleBlock(schedule, startMinutes, endMinutes) {
    const block = document.createElement('div');
    block.className = 'schedule-block ' + (schedule.enabled ? '' : 'inactive');

    const top = startMinutes;
    const height = endMinutes - startMinutes;

    block.style.top = top + 'px';
    block.style.height = height + 'px';

    if (height >= 40) {
        block.innerHTML = '<strong>' + schedule.startTime + '</strong><span>a</span><strong>' + schedule.endTime + '</strong>';
    } else {
        block.title = schedule.startTime + ' - ' + schedule.endTime;
    }

    let clickTimer = null;
    let clickCount = 0;

    block.addEventListener('click', (e) => {
        e.preventDefault();
        clickCount++;

        if (clickCount === 1) {
            clickTimer = setTimeout(() => {
                toggleSchedule(schedule.id);
                clickCount = 0;
            }, 250);
        } else if (clickCount === 2) {
            clearTimeout(clickTimer);
            clickCount = 0;
            if (confirm('¿Estás seguro de que deseas ELIMINAR este horario permanentemente?')) {
                deleteSchedule(schedule.id);
            }
        }
    });

    return block;
}

// ===== QUICK SCHEDULES =====

function setWeekdaySchedule() {
    schedules.push({ id: Date.now(), days: [1, 2, 3, 4, 5], startTime: '07:00', endTime: '21:00', enabled: true });
    saveSchedules();
    showStatus('Horario Lun-Vie agregado');
}

function setWeekendSchedule() {
    schedules.push({ id: Date.now(), days: [0, 6], startTime: '09:00', endTime: '23:00', enabled: true });
    saveSchedules();
    showStatus('Horario Fin de Semana agregado');
}

function setEveningSchedule() {
    schedules.push({ id: Date.now(), days: [0, 1, 2, 3, 4, 5, 6], startTime: '17:00', endTime: '23:00', enabled: true });
    saveSchedules();
    showStatus('Horario de Tardes agregado');
}

function clearAllSchedules() {
    if (confirm('¿Eliminar TODOS los horarios programados?')) {
        schedules = [];
        saveSchedules();
        showStatus('Todos los horarios eliminados');
    }
}

// ===== SCHEDULER =====

function updateScheduler() {
    const enabled = document.getElementById('schedulerEnabled').checked;
    localStorage.setItem('schedulerEnabled', enabled.toString());

    updateSchedulerStatus();

    if (enabled) {
        showStatus('Programación automática activada');
        addDebugLog('Programación automática activada', 'success');
        checkSchedules();
    } else {
        showStatus('Programación automática desactivada');
        addDebugLog('Programación automática desactivada', 'info');
    }

    if (mqttClient && mqttClient.connected) {
        const schedulesData = {
            schedules: schedules,
            enabled: enabled,
            timestamp: Date.now()
        };
        mqttClient.publish('wled/tree/schedules', JSON.stringify(schedulesData), { retain: true });
        addDebugLog('Estado del scheduler publicado', 'success');
    }
}

function saveTimezone() {
    const select = document.getElementById('timezoneSelect');
    if (select) {
        userTimezone = select.value;
        localStorage.setItem('userTimezone', userTimezone);
        addDebugLog('Zona horaria cambiada a: ' + userTimezone, 'info');
        lastScheduleState = null;

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
            addDebugLog('Zona horaria cargada: ' + userTimezone, 'info');
        }
    } else {
        userTimezone = 'America/Santo_Domingo';
        localStorage.setItem('userTimezone', userTimezone);
        addDebugLog('Zona horaria establecida por defecto: ' + userTimezone, 'info');
        const select = document.getElementById('timezoneSelect');
        if (select) {
            select.value = userTimezone;
        }
    }
}

function updateSchedulerStatus() {
    const schedulerCheckbox = document.getElementById('schedulerEnabled');
    const statusText = document.getElementById('scheduleStatusText');

    if (!schedulerCheckbox || !statusText) return;

    const enabled = schedulerCheckbox.checked;
    if (enabled) {
        const activeSchedule = getActiveSchedule();
        if (activeSchedule) {
            statusText.textContent = 'ENCENDIDO (hasta ' + activeSchedule.endTime + ')';
            statusText.style.color = '#28a745';
        } else {
            statusText.textContent = 'APAGADO (esperando horario)';
            statusText.style.color = '#dc3545';
        }
    } else {
        statusText.textContent = 'Desactivado';
        statusText.style.color = '#6c757d';
    }
}

function getActiveSchedule() {
    if (!userTimezone || userTimezone === 'undefined') {
        userTimezone = 'America/Santo_Domingo';
    }

    let formatter, parts;
    try {
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            hour: '2-digit', minute: '2-digit',
            hour12: false, weekday: 'short'
        });
        parts = formatter.formatToParts(new Date());
    } catch (e) {
        console.error('Error con zona horaria:', e);
        userTimezone = 'America/Santo_Domingo';
        formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: userTimezone,
            hour: '2-digit', minute: '2-digit',
            hour12: false, weekday: 'short'
        });
        parts = formatter.formatToParts(new Date());
    }

    const hours = parseInt(parts.find(p => p.type === 'hour').value);
    const minutes = parseInt(parts.find(p => p.type === 'minute').value);
    const weekday = parts.find(p => p.type === 'weekday').value;

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
            if (schedule.days.includes(currentDay) && currentTime >= startMinutes && currentTime < endMinutes) {
                return schedule;
            }
        } else {
            const prevDay = (currentDay === 0) ? 6 : currentDay - 1;
            if (schedule.days.includes(prevDay) && currentTime >= 0 && currentTime < endMinutes) {
                return schedule;
            }
            if (schedule.days.includes(currentDay) && currentTime >= startMinutes && currentTime <= 1439) {
                return schedule;
            }
        }
    }

    return null;
}

async function checkSchedules() {
    if (!mqttClient || !mqttClient.connected) {
        if (schedulerInterval && !window.schedulerConnectionWarned) {
            addDebugLog('Esperando conexión MQTT para scheduler...', 'info');
            window.schedulerConnectionWarned = true;
        }
        return;
    }

    if (window.schedulerConnectionWarned) {
        addDebugLog('Conexión MQTT restaurada - Scheduler activo', 'success');
        window.schedulerConnectionWarned = false;
    }

    if (!document.getElementById('schedulerEnabled') || !document.getElementById('schedulerEnabled').checked) {
        return;
    }

    const activeSchedule = getActiveSchedule();
    const shouldBeOn = activeSchedule !== null;

    const isFirstRun = lastScheduleState === null;
    if (isFirstRun) {
        lastScheduleState = shouldBeOn;
        addDebugLog('Estado inicial del scheduler: ' + (shouldBeOn ? 'Horario activo' : 'Fuera de horario'), 'info');
        if (!wledStateReceived) {
            addDebugLog('Estado de WLED no recibido aún, asumiendo apagado inicialmente', 'info');
            wledIsOn = false;
        }
    }

    const scheduleStateChanged = !isFirstRun && (lastScheduleState !== shouldBeOn);
    const isOutOfSync = !isFirstRun && (wledIsOn !== shouldBeOn);

    if (scheduleStateChanged || isOutOfSync) {
        addDebugLog('Verificación: shouldBeOn=' + shouldBeOn + ', wledIsOn=' + wledIsOn + ', isOutOfSync=' + isOutOfSync, 'info');
    }

    if (scheduleStateChanged) {
        lastScheduleState = shouldBeOn;
        addDebugLog('Cambio de horario detectado: ' + (shouldBeOn ? 'Entrando en horario' : 'Saliendo de horario'), 'info');
    }

    if (scheduleStateChanged || isOutOfSync) {
        if (shouldBeOn && !wledIsOn) {
            addDebugLog('Horario activo - Encendiendo LEDs', 'success');
            showStatus('Horario: Encendiendo LEDs');

            await sendMQTTCommand({ "on": true, "bri": currentBrightness });
            wledIsOn = true;
        } else if (!shouldBeOn && wledIsOn) {
            addDebugLog('Fuera de horario - Apagando LEDs (forzado)', 'info');
            showStatus('Fuera de horario: Apagando LEDs');

            await sendMQTTCommand({ "on": false });
            updateAllLEDsVisual('#000000');
            wledIsOn = false;
        }
    }

    updateSchedulerStatus();
}

async function testScheduleOff() {
    addDebugLog('Test: Enviando comando OFF completo', 'info');
    const offCommand = {
        "on": false, "bri": 0,
        "seg": [{ "id": 0, "on": false, "bri": 0, "fx": 0, "col": [[0, 0, 0], [0, 0, 0], [0, 0, 0]] }],
        "transition": 0
    };

    const success = await sendMQTTCommand(offCommand);
    if (success) {
        updateAllLEDsVisual('#000000');
        showStatus('Comando OFF de prueba enviado');
    }
}

// ===== DEBUG LOG =====

function addDebugLog(message, type = 'info') {
    const logDiv = document.getElementById('debugLog');
    const entry = document.createElement('div');
    entry.className = type;
    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = '[' + timestamp + '] ' + message;
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
    while (logDiv.children.length > 50) {
        logDiv.removeChild(logDiv.firstChild);
    }
}

// ===== PAINT MODE =====

function activatePaintMode() {
    paintMode = !paintMode;
    const btn = document.getElementById('paintBtn');
    const palette = document.getElementById('colorPalette');

    if (paintMode) {
        btn.classList.add('active');
        btn.textContent = 'Paint Mode: ON';
        palette.style.display = 'grid';
        showStatus('Paint Mode activado');
        addDebugLog('Paint Mode activado', 'info');
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
    addDebugLog('Color seleccionado: ' + selectedColor, 'info');
}

function selectPaletteColor(color) {
    selectedColor = color;
    document.getElementById('ledColor').value = color;

    document.querySelectorAll('.palette-color').forEach(el => {
        el.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

// ===== BRIGHTNESS =====

let brightnessTimeout = null;

function setBrightness(value) {
    currentBrightness = parseInt(value);
    updateBrightnessLabel(value);

    localStorage.setItem('lastBrightness', currentBrightness.toString());

    if (brightnessTimeout) clearTimeout(brightnessTimeout);

    brightnessTimeout = setTimeout(() => {
        addDebugLog('Aplicando brillo: ' + currentBrightness, 'info');
        sendMQTTCommand({"bri": currentBrightness});

        if (mqttClient && mqttClient.connected) {
            mqttClient.publish('wled/tree/brightness', currentBrightness.toString(), { retain: true });
        }
    }, 300);
}

function updateBrightnessLabel(value) {
    const percent = Math.round(value / 2.55);
    document.getElementById('brightVal').textContent = percent + '%';
}

// ===== SAVED DESIGNS =====

function saveDesign() {
    const name = document.getElementById('designName').value.trim();
    if (!name) {
        showStatus('Escribe un nombre para el diseño.', true);
        return;
    }

    const designToSave = {};
    for (const [index, color] of Object.entries(ledColors)) {
        if (color !== '#333333' && color !== '#000000') {
            designToSave[index] = color;
        }
    }

    if (Object.keys(designToSave).length === 0) {
        showStatus('No hay LEDs encendidos para guardar.', true);
        return;
    }

    let designs = JSON.parse(localStorage.getItem('wledDesigns')) || {};
    designs[name] = designToSave;
    localStorage.setItem('wledDesigns', JSON.stringify(designs));

    showStatus('Diseño "' + name + '" guardado.');
    addDebugLog('Diseño guardado: ' + name, 'success');
    document.getElementById('designName').value = '';
    loadDesigns();
}

function loadDesigns() {
    const designs = JSON.parse(localStorage.getItem('wledDesigns')) || {};
    const listDiv = document.getElementById('designsList');
    listDiv.innerHTML = '';

    if (Object.keys(designs).length === 0) {
        listDiv.innerHTML = '<p style="color: #666; font-size: 14px;">No hay diseños guardados.</p>';
        return;
    }

    Object.keys(designs).forEach(name => {
        const item = document.createElement('div');
        item.className = 'design-item';
        item.innerHTML = '<span>' + escapeHTML(name) + '</span><div><button onclick="applyDesign(\'' + escapeHTML(name) + '\')">Cargar</button><button class="delete-btn" onclick="deleteDesign(\'' + escapeHTML(name) + '\')">X</button></div>';
        listDiv.appendChild(item);
    });
}

async function applyDesign(name) {
    const designs = JSON.parse(localStorage.getItem('wledDesigns')) || {};
    const design = designs[name];

    if (!design) {
        showStatus('No se encontró el diseño.', true);
        return;
    }

    stopAllAnimations();

    const payload_i = [];
    for (let i = 0; i < totalLeds; i++) {
        ledColors[i] = '#333333';
        updateLEDVisual(i, '#333333', false);
    }

    for (const [index, color] of Object.entries(design)) {
        const rgb = hexToRgb(color);
        const idx = parseInt(index);
        payload_i.push(idx, [rgb.r, rgb.g, rgb.b]);
        ledColors[idx] = color;
        updateLEDVisual(idx, color, false);
    }

    ledMeshes.forEach(mesh => { mesh.material.needsUpdate = true; });

    await sendMQTTCommand({ "on": true, "seg": [{ "fx": 0, "i": payload_i }] });
    showStatus('Diseño "' + name + '" cargado.');
    addDebugLog('Diseño cargado: ' + name, 'success');
}

function deleteDesign(name) {
    if (!confirm('¿Seguro que quieres borrar el diseño "' + name + '"?')) return;

    let designs = JSON.parse(localStorage.getItem('wledDesigns')) || {};
    delete designs[name];
    localStorage.setItem('wledDesigns', JSON.stringify(designs));
    showStatus('Diseño "' + name + '" borrado.');
    addDebugLog('Diseño eliminado: ' + name, 'info');
    loadDesigns();
}

// ===== UTILITIES =====

function generateStars() {
    const starsContainer = document.getElementById('stars');
    for (let i = 0; i < 100; i++) {
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
    setTimeout(() => { status.remove(); }, 3000);
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
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
}

// =====================================================
// INITIALIZATION
// =====================================================

window.onload = function () {
    addDebugLog('Aplicación iniciada', 'success');
    addDebugLog('Versión completa con Scheduler', 'info');

    // Restore last brightness
    const savedBrightness = localStorage.getItem('lastBrightness');
    if (savedBrightness) {
        const brightness = parseInt(savedBrightness);
        currentBrightness = brightness;
        document.getElementById('brightness').value = brightness;
        updateBrightnessLabel(brightness);
        addDebugLog('Brillo restaurado: ' + brightness, 'info');
    }

    initThreeJS();
    generateStars();
    loadDesigns();
    loadSchedules();
    loadTimezone();

    // Start MQTT connection
    setTimeout(() => { initMQTT(); }, 500);

    // Start schedule checker
    setTimeout(() => {
        schedulerInterval = setInterval(() => { checkSchedules(); }, 20000);
        setTimeout(() => { checkSchedules(); }, 3000);
    }, 2000);
};
