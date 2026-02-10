// =====================================================
// WLED API - Designs, Effects, Palettes, Animations
// =====================================================

async function resetWLED() {
    stopAllAnimations();
    addDebugLog('Apagando LEDs...', 'info');

    await sendMQTTCommand({
        "on": false,
        "seg": [{
            "fx": 0,
            "sx": 0,
            "ix": 0,
            "pal": 0,
            "col": [[0, 0, 0]]
        }]
    });
    updateAllLEDsVisual('#000000');
    showStatus('LEDs apagados');
}

function applyColorOrder(r, g, b) {
    switch (COLOR_ORDER) {
        case 'RGB': return [r, g, b];
        case 'GRB': return [g, r, b];
        case 'BGR': return [b, g, r];
        case 'RBG': return [r, b, g];
        case 'GBR': return [g, b, r];
        case 'BRG': return [b, r, g];
        default:    return [r, g, b];
    }
}

// =====================================================
// STATIC DESIGNS
// =====================================================

function setStaticDesign(designName) {
    stopAllAnimations();
    currentEffect = designName;

    addDebugLog('Aplicando diseño estático: ' + designName, 'info');

    document.querySelectorAll('.effect-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event && event.target) {
        event.target.classList.add('active');
    }

    switch (designName) {
        case 'OFF':           applyOFFDesign(); break;
        case 'Solid':         applySolidDesign(); break;
        case 'Rainbow':       applyRainbowDesign(); break;
        case 'Warm':          applyWarmDesign(); break;
        case 'Cold':          applyColdDesign(); break;
        case 'Purple Rain':   applyPurpleRainDesign(); break;
        case 'Dominican':     applyDominicanDesign(); break;
    }
}

async function applyOFFDesign() {
    updateAllLEDsVisual('#000000');
    await sendMQTTCommand({ "on": false });
    showStatus('LEDs apagados');
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
    showStatus('Solid ' + selectedColor);
}

async function applyRainbowDesign(sendToWLED = true) {
    addDebugLog('Aplicando Rainbow', 'info');
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
            "seg": [{ "id": 0, "fx": 9, "pal": 11 }]
        });
    }
    showStatus('Rainbow aplicado');
}

async function applyWarmDesign() {
    const warmColor = '#ffe4b5';
    updateAllLEDsVisual(warmColor);
    const rgb = hexToRgb(warmColor);

    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "seg": [{ "id": 0, "fx": 0, "col": [applyColorOrder(rgb.r, rgb.g, rgb.b)] }]
    });
    showStatus('Warm aplicado');
}

async function applyColdDesign() {
    addDebugLog('Aplicando Cold', 'info');
    const coldColors = ['#0066ff', '#00ccff', '#6600ff', '#00ffff', '#3366ff'];
    for (let i = 0; i < totalLeds; i++) {
        const colorHex = coldColors[i % coldColors.length];
        updateLEDVisual(i, colorHex, false);
    }
    ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);

    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "seg": [{ "id": 0, "fx": 67, "pal": 9 }]
    });
    showStatus('Cold aplicado');
}

async function applyPurpleRainDesign() {
    const purpleColor = '#8b00ff';
    updateAllLEDsVisual(purpleColor);
    const rgb = hexToRgb(purpleColor);

    await sendMQTTCommand({
        "on": true,
        "bri": currentBrightness,
        "seg": [{ "id": 0, "fx": 0, "col": [applyColorOrder(rgb.r, rgb.g, rgb.b)] }]
    });
    showStatus('Purple Rain aplicado');
}

async function applyDominicanDesign() {
    addDebugLog('Aplicando Dominican', 'info');
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
        "seg": [{ "id": 0, "fx": 2, "pal": 255 }]
    });
    showStatus('Dominican aplicado');
}

// =====================================================
// ANIMATED EFFECTS
// =====================================================

function runAnimatedEffect(effectName, sendToWLED = true) {
    if (effectAnimationInterval) clearInterval(effectAnimationInterval);
    if (localAnimationInterval) clearInterval(localAnimationInterval);

    currentLocalAnimation = effectName;
    showStatus('Animación "' + effectName + '" iniciada');
    addDebugLog('Iniciando animación: ' + effectName, 'info');

    const effectMap = {
        'Fire':    { fx: 45, pal: 35, animate: animateFire },
        'Chase':   { fx: 28, animate: animateChase },
        'Twinkle': { fx: 17, animate: animateTwinkle },
        'Sparkle': { fx: 20, animate: animateSparkle },
        'Ripple':  { fx: 79, animate: animateRipple },
        'Blink':   { fx: 1,  animate: animateBlink },
        'Scan':    { fx: 10, animate: animateScan },
        'Waves':   { fx: 67, animate: animateWaves },
        'Fairy':   { fx: 49, animate: animateFairy },
        'Flow':    { fx: 110, animate: animateFlow }
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

// =====================================================
// PALETTES & EFFECTS
// =====================================================

async function setPalette(paletteId) {
    addDebugLog('Cambiando palette a: ' + paletteId + ' (manteniendo efecto ' + currentEffectId + ')', 'info');

    currentPaletteId = paletteId;

    const paletteBaseColors = {
        2: '#9B30FF',   6: '#FF1493',   7: '#87CEEB',   8: '#FF4500',
        9: '#006994',   10: '#9ACD32',  11: '#FF0000',  13: '#FF6347',
        20: '#FFB6C1',  26: '#20B2AA',  35: '#FF4500',  48: '#E74C3C',
        50: '#00FF7F',  255: '#0038A8'
    };

    let colorToUse = selectedColor;
    if (paletteBaseColors[paletteId]) {
        colorToUse = paletteBaseColors[paletteId];
        selectedColor = colorToUse;
        document.getElementById('ledColor').value = colorToUse;
        addDebugLog('Color base establecido a ' + colorToUse + ' para palette ' + paletteId, 'info');
    }

    const rgb = hexToRgb(colorToUse);
    const colorArray = applyColorOrder(rgb.r, rgb.g, rgb.b);

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

    if (currentEffectId === 0) {
        updateAllLEDsVisual(colorToUse);
    }

    showStatus('Palette ' + paletteId + ' aplicada con efecto ' + currentEffectId);
}

async function runEffect(fxId) {
    addDebugLog('Aplicando efecto: fx=' + fxId + ' con palette=' + currentPaletteId, 'info');

    currentEffectId = fxId;

    if (effectAnimationInterval) clearInterval(effectAnimationInterval);
    if (localAnimationInterval) clearInterval(localAnimationInterval);

    const rgb = hexToRgb(selectedColor);
    const colorArray = applyColorOrder(rgb.r, rgb.g, rgb.b);

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

    updateAllLEDsVisual(selectedColor);
    showStatus('Effect ' + fxId + ' aplicado con palette ' + currentPaletteId);
}

function getEffectName(fxId) {
    const effectNames = {
        1: 'Blink', 9: 'Rainbow', 10: 'Scan', 17: 'Twinkle', 20: 'Sparkle',
        28: 'Chase', 45: 'Fire', 67: 'Waves', 79: 'Ripple', 110: 'Flow'
    };
    return effectNames[fxId] || null;
}

function getAnimationFunction(fxId) {
    const animations = {
        1: animateBlink, 10: animateScan, 17: animateTwinkle, 20: animateSparkle,
        28: animateChase, 45: animateFire, 67: animateWaves, 79: animateRipple, 110: animateFlow
    };
    return animations[fxId] || null;
}

// =====================================================
// LOCAL ANIMATION FUNCTIONS
// =====================================================

function animateFire() {
    effectAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            const intensity = Math.random();
            const r = 255;
            const g = Math.floor(intensity * 150);
            const b = 0;
            updateLEDVisual(i, rgbToHex(r, g, b), false);
        }
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
    }, 100);
}

function animateChase() {
    let pos = 0;
    effectAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            updateLEDVisual(i, i % 10 === pos ? selectedColor : '#000000', false);
        }
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
        pos = (pos + 1) % 10;
    }, 100);
}

function animateTwinkle() {
    effectAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            updateLEDVisual(i, Math.random() > 0.95 ? '#ffffff' : selectedColor, false);
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
            const distance = Math.abs(i - totalLeds / 2);
            const wave = Math.sin((distance + offset) * 0.3) * 0.5 + 0.5;
            const rgb = hexToRgb(selectedColor);
            updateLEDVisual(i, rgbToHex(
                Math.floor(rgb.r * wave),
                Math.floor(rgb.g * wave),
                Math.floor(rgb.b * wave)
            ), false);
        }
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
        offset += 1;
    }, 80);
}

function animateBlink() {
    let on = true;
    localAnimationInterval = setInterval(() => {
        updateAllLEDsVisual(on ? selectedColor : '#000000');
        on = !on;
    }, 500);
}

function animateScan() {
    let currentLed = 0;
    localAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            updateLEDVisual(i, i === currentLed ? selectedColor : '#000000', false);
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
            updateLEDVisual(i, rgbToHex(
                Math.floor(rgb.r * wave),
                Math.floor(rgb.g * wave),
                Math.floor(rgb.b * wave)
            ), false);
        }
        ledMeshes.forEach(mesh => mesh.material.needsUpdate = true);
        offset += 1;
    }, 100);
}

function animateFairy() {
    localAnimationInterval = setInterval(() => {
        for (let i = 0; i < totalLeds; i++) {
            updateLEDVisual(i, Math.random() > 0.7 ? selectedColor : '#000000', false);
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
            updateLEDVisual(i, rgbToHex(color.r, color.g, color.b), false);
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
    addDebugLog('Animación detenida', 'info');
}
