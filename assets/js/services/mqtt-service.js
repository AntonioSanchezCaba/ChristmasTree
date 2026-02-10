// =====================================================
// MQTT SERVICE - Connection, Messaging, State Parsing
// =====================================================

function initMQTT() {
    addDebugLog('Iniciando conexión a Mosquitto...', 'info');
    addDebugLog('Broker: ' + MQTT_CONFIG.broker, 'info');

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
            addDebugLog('Conectado exitosamente a Mosquitto!', 'success');
            document.getElementById('connectionStatus').className = 'connection-status connected';
            document.getElementById('connectionStatus').textContent = 'Conectado';

            mqttClient.subscribe('wled/tree/#', (err) => {
                if (!err) {
                    addDebugLog('Suscrito a topics WLED', 'success');
                    addDebugLog('Esperando estado de WLED desde wled/tree/v...', 'info');

                    setTimeout(() => {
                        if (schedules.length > 0 || document.getElementById('schedulerEnabled').checked) {
                            const schedulesData = {
                                schedules: schedules,
                                enabled: document.getElementById('schedulerEnabled').checked,
                                timestamp: Date.now()
                            };
                            mqttClient.publish('wled/tree/schedules', JSON.stringify(schedulesData), { retain: true });
                            addDebugLog('Horarios locales publicados al conectar', 'info');
                        }
                    }, 500);
                } else {
                    addDebugLog('Error al suscribirse: ' + err.message, 'error');
                }
            });
        });

        mqttClient.on('error', (err) => {
            addDebugLog('Error MQTT: ' + err.message, 'error');
            document.getElementById('connectionStatus').className = 'connection-status disconnected';
            document.getElementById('connectionStatus').textContent = 'Error de conexión';
        });

        mqttClient.on('reconnect', () => {
            addDebugLog('Intentando reconectar...', 'info');
            document.getElementById('connectionStatus').className = 'connection-status connecting';
            document.getElementById('connectionStatus').textContent = 'Reconectando...';
            lastScheduleState = null;
            wledStateReceived = false;
        });

        mqttClient.on('offline', () => {
            addDebugLog('Cliente MQTT offline', 'error');
            document.getElementById('connectionStatus').className = 'connection-status disconnected';
            document.getElementById('connectionStatus').textContent = 'Desconectado';
        });

        mqttClient.on('message', (topic, message) => {
            const payloadStr = message.toString();

            // Brightness sync
            if (topic === 'wled/tree/brightness') {
                const brightness = parseInt(payloadStr);
                if (!isNaN(brightness) && brightness >= 0 && brightness <= 255) {
                    if (Math.abs(brightness - currentBrightness) > 2) {
                        currentBrightness = brightness;
                        document.getElementById('brightness').value = brightness;
                        updateBrightnessLabel(brightness);
                        localStorage.setItem('lastBrightness', brightness.toString());
                        addDebugLog('Brillo sincronizado desde otro dispositivo: ' + brightness, 'success');
                    }
                }
                return;
            }

            // Schedule sync
            if (topic === 'wled/tree/schedules') {
                try {
                    const data = JSON.parse(payloadStr);
                    if (data.schedules && Array.isArray(data.schedules)) {
                        const timeDiff = Date.now() - (data.timestamp || 0);
                        if (timeDiff > 1000) {
                            schedules = data.schedules;
                            localStorage.setItem('wledSchedules', JSON.stringify(schedules));

                            if (typeof data.enabled !== 'undefined') {
                                document.getElementById('schedulerEnabled').checked = data.enabled;
                                localStorage.setItem('schedulerEnabled', data.enabled.toString());
                            }

                            renderScheduleGrid();
                            addDebugLog('Horarios sincronizados desde otro dispositivo', 'success');
                        }
                    }
                } catch (e) {
                    addDebugLog('Error al procesar horarios: ' + e.message, 'error');
                }
                return;
            }

            // WLED state messages
            if (topic === 'wled/tree/v' || topic === 'wled/tree/state' || topic === 'wled/tree/api') {
                const trimmedPayload = payloadStr.trim();

                if (trimmedPayload.length === 0) {
                    addDebugLog(topic + ': (vacío)', 'info');
                    return;
                }

                const preview = trimmedPayload.substring(0, 80);
                addDebugLog(topic + ': ' + preview + (trimmedPayload.length > 80 ? '...' : ''), 'success');

                // XML format
                if (trimmedPayload.startsWith('<?xml') || trimmedPayload.startsWith('<')) {
                    const state = parseWLEDXML(trimmedPayload);
                    if (state) {
                        handleWLEDState(state);
                    }
                    return;
                }

                // JSON format
                if (!trimmedPayload.startsWith('{') && !trimmedPayload.startsWith('[')) {
                    addDebugLog(topic + ': Formato desconocido', 'error');
                    return;
                }

                try {
                    const data = JSON.parse(payloadStr);
                    const isCompleteState = data.state || (data.seg && data.on !== undefined);

                    if (isCompleteState) {
                        addDebugLog('Estado completo detectado en ' + topic, 'info');
                        const state = data.state || data;
                        handleWLEDState(state);
                    } else {
                        addDebugLog('Comando parcial ignorado en ' + topic + ' (solo tiene: ' + Object.keys(data).join(',') + ')', 'info');
                    }
                } catch (e) {
                    // Ignore JSON parse errors silently
                }
            }
        });

    } catch (error) {
        addDebugLog('Error crítico al inicializar: ' + error.message, 'error');
    }
}

function reconnectMQTT() {
    if (mqttClient) {
        addDebugLog('Desconectando cliente anterior...', 'info');
        mqttClient.end(true);
        mqttClient = null;
    }
    setTimeout(() => {
        initMQTT();
    }, 500);
}

// =====================================================
// WLED XML PARSER
// =====================================================

function parseWLEDXML(xmlString) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Error al parsear XML');
        }

        const vs = xmlDoc.querySelector('vs');
        if (!vs) {
            throw new Error('No se encontró elemento <vs> en XML');
        }

        const acElement = vs.querySelector('ac');
        const brightness = acElement ? parseInt(acElement.textContent) : 128;

        const clElements = vs.querySelectorAll('cl');
        const colors = Array.from(clElements).map(el => parseInt(el.textContent));

        const fxElement = vs.querySelector('fx');
        const fx = fxElement ? parseInt(fxElement.textContent) : 0;

        const fpElement = vs.querySelector('fp');
        const pal = fpElement ? parseInt(fpElement.textContent) : 0;

        const isOn = brightness > 0;

        const state = {
            on: isOn,
            bri: brightness,
            seg: [{
                col: [colors.length >= 3 ? colors.slice(0, 3) : [255, 255, 255]],
                fx: fx,
                pal: pal
            }]
        };

        addDebugLog('Estado: ' + (isOn ? 'ON' : 'OFF') + ', Brillo: ' + brightness + ', FX: ' + fx + ', Pal: ' + pal, 'success');

        return state;
    } catch (e) {
        addDebugLog('Error al parsear XML de WLED: ' + e.message, 'error');
        return null;
    }
}

// =====================================================
// WLED STATE HANDLER
// =====================================================

function handleWLEDState(state) {
    if (!state) {
        addDebugLog('Estado WLED recibido pero vacío', 'error');
        return;
    }

    if (!ledsReady || ledMeshes.length === 0) {
        addDebugLog('LEDs no listos, guardando estado para aplicar después...', 'info');
        pendingWLEDState = state;
        return;
    }

    // Loop protection
    const now = Date.now();
    const fx = state.seg?.[0]?.fx;
    const pal = state.seg?.[0]?.pal;
    const bri = state.bri;
    const stateSignature = fx + '-' + pal + '-' + bri;

    if (stateSignature === lastProcessedState && (now - lastProcessedTime) < 800) {
        return;
    }

    lastProcessedState = stateSignature;
    lastProcessedTime = now;

    // 1. Update Brightness
    if (typeof state.bri !== 'undefined') {
        const brightness = state.bri;

        if (!initialBrightnessSet) {
            const savedBrightness = localStorage.getItem('lastBrightness');
            if (savedBrightness) {
                const localBri = parseInt(savedBrightness);
                if (Math.abs(localBri - brightness) > 2) {
                    addDebugLog('Restaurando brillo guardado: ' + localBri + ' (WLED tiene: ' + brightness + ')', 'info');
                    currentBrightness = localBri;
                    document.getElementById('brightness').value = localBri;
                    updateBrightnessLabel(localBri);

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

        if (Math.abs(brightness - currentBrightness) > 2) {
            document.getElementById('brightness').value = brightness;
            updateBrightnessLabel(brightness);
            currentBrightness = brightness;
            localStorage.setItem('lastBrightness', brightness.toString());

            if (mqttClient && mqttClient.connected) {
                mqttClient.publish('wled/tree/brightness', brightness.toString(), { retain: true });
            }
        }
    }

    // 2. Update On/Off State
    const previousState = wledIsOn;
    wledIsOn = state.on === true;
    wledStateReceived = true;

    if (previousState !== wledIsOn) {
        addDebugLog('Estado WLED actualizado: ' + (wledIsOn ? 'Encendido' : 'Apagado'), 'info');
    }

    if (typeof state.on === 'undefined' || !state.on) {
        addDebugLog('Apagado', 'info');
        updateAllLEDsVisual('#000000');
        return;
    }

    // 3. Update Colors and Effects
    if (state.seg && state.seg[0]) {
        const segment = state.seg[0];
        const segFx = segment.fx;
        const segPal = segment.pal;
        const col = segment.col[0] || [255, 0, 0];

        currentEffectId = segFx;
        currentPaletteId = segPal || 0;

        const hexColor = rgbToHex(col[0], col[1], col[2]);

        selectedColor = hexColor;
        document.getElementById('ledColor').value = hexColor;

        stopAllAnimations();

        if (segFx === 0) {
            addDebugLog('Sincronizando: Color Sólido ' + hexColor, 'info');
            updateAllLEDsVisual(hexColor);
        } else {
            addDebugLog('Sincronizando: Efecto ' + segFx + ', Paleta ' + (segPal || 'default'), 'info');
            updateAllLEDsVisual(hexColor);
        }
    }
}

// =====================================================
// SEND MQTT COMMANDS
// =====================================================

async function sendMQTTCommand(payload) {
    if (!mqttClient || !mqttClient.connected) {
        addDebugLog('No hay conexión MQTT', 'error');
        showStatus('No conectado a MQTT', true);
        return false;
    }

    const payloadStr = JSON.stringify(payload);
    addDebugLog('Enviando comando: ' + payloadStr.substring(0, 80) + '...', 'info');

    try {
        mqttClient.publish(MQTT_CONFIG.topic, payloadStr, { qos: 1, retain: false }, (err) => {
            if (err) {
                addDebugLog('Error al publicar: ' + err.message, 'error');
            } else {
                addDebugLog('Comando enviado correctamente', 'success');
            }
        });
        return true;
    } catch (error) {
        addDebugLog('Excepción al publicar: ' + error.message, 'error');
        return false;
    }
}

async function sendTestMessage() {
    const testPayload = {
        "test": true,
        "timestamp": new Date().toISOString(),
        "message": "Test desde interfaz web"
    };

    addDebugLog('Enviando mensaje de prueba...', 'info');
    const success = await sendMQTTCommand(testPayload);

    if (success) {
        showStatus('Mensaje de prueba enviado');
    }
}
