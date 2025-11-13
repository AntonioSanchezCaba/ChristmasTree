#!/usr/bin/env node

/**
 * WLED Christmas Tree Scheduler - Servicio Autónomo
 *
 * Este script se ejecuta 24/7 en un servidor y maneja los horarios
 * automáticamente sin necesidad de tener la página web abierta.
 *
 * Se conecta a MQTT, lee los horarios configurados y enciende/apaga
 * los LEDs según corresponda basándose en la zona horaria configurada.
 */

const mqtt = require('mqtt');

// =====================================================
// CONFIGURACIÓN
// =====================================================

const CONFIG = {
    mqtt: {
        broker: 'wss://mqtt.vittence.com:8084/mqtt',
        topic: 'wled/tree/api',
        schedulesTopic: 'wled/tree/schedules',
        clientId: 'wled-scheduler-' + Math.random().toString(16).substr(2, 8)
    },
    scheduler: {
        checkInterval: 20000, // Verificar cada 20 segundos
        timezone: 'America/Santo_Domingo',
        defaultBrightness: 128
    }
};

// =====================================================
// VARIABLES GLOBALES
// =====================================================

let mqttClient = null;
let schedules = [];
let schedulerEnabled = false;
let userTimezone = CONFIG.scheduler.timezone;
let lastScheduleState = null;
let wledIsOn = false;

// =====================================================
// FUNCIONES DE LOGGING
// =====================================================

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleString('es-DO', {
        timeZone: userTimezone,
        hour12: false
    });

    const prefix = {
        'info': 'ℹ️ ',
        'success': '✅',
        'error': '❌',
        'warn': '⚠️ ',
        'schedule': '⏰'
    }[type] || 'ℹ️ ';

    console.log(`[${timestamp}] ${prefix} ${message}`);
}

// =====================================================
// CONEXIÓN MQTT
// =====================================================

function connectMQTT() {
    log('Conectando a broker MQTT...', 'info');
    log(`Broker: ${CONFIG.mqtt.broker}`, 'info');

    const options = {
        clientId: CONFIG.mqtt.clientId,
        clean: true,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        protocol: 'wss',
        rejectUnauthorized: true,
        keepalive: 60
    };

    mqttClient = mqtt.connect(CONFIG.mqtt.broker, options);

    mqttClient.on('connect', () => {
        log('Conectado exitosamente a MQTT', 'success');

        // Suscribirse al topic de horarios
        mqttClient.subscribe(CONFIG.mqtt.schedulesTopic, (err) => {
            if (!err) {
                log('Suscrito a topic de horarios', 'success');
                // Solicitar horarios actuales (se recibirán por mensaje retenido)
            } else {
                log('Error al suscribirse: ' + err.message, 'error');
            }
        });

        // Suscribirse al topic de estado de WLED
        mqttClient.subscribe('wled/tree/v', (err) => {
            if (!err) {
                log('Suscrito a estado de WLED', 'success');
            }
        });
    });

    mqttClient.on('message', (topic, message) => {
        handleMQTTMessage(topic, message.toString());
    });

    mqttClient.on('error', (err) => {
        log('Error MQTT: ' + err.message, 'error');
    });

    mqttClient.on('reconnect', () => {
        log('Reconectando a MQTT...', 'info');
        lastScheduleState = null; // Resetear estado al reconectar
    });

    mqttClient.on('offline', () => {
        log('Cliente MQTT offline', 'warn');
    });
}

// =====================================================
// MANEJO DE MENSAJES MQTT
// =====================================================

function handleMQTTMessage(topic, payload) {
    try {
        if (topic === CONFIG.mqtt.schedulesTopic) {
            // Recibir configuración de horarios
            const data = JSON.parse(payload);
            if (data.schedules && Array.isArray(data.schedules)) {
                schedules = data.schedules;
                schedulerEnabled = data.enabled || false;
                userTimezone = data.timezone || CONFIG.scheduler.timezone;

                log(`Horarios actualizados: ${schedules.length} horarios, Enabled: ${schedulerEnabled}, Timezone: ${userTimezone}`, 'info');

                // Verificar inmediatamente después de actualizar
                setTimeout(() => checkSchedules(), 1000);
            }
        } else if (topic === 'wled/tree/v') {
            // Estado de WLED (XML)
            const state = parseWLEDXML(payload);
            if (state) {
                wledIsOn = state.on;
            }
        }
    } catch (e) {
        log('Error al procesar mensaje MQTT: ' + e.message, 'error');
    }
}

// =====================================================
// PARSER DE XML DE WLED
// =====================================================

function parseWLEDXML(xmlString) {
    try {
        // Simple parser para extraer estado on/off del XML
        const brightnessMatch = xmlString.match(/<ac>(\d+)<\/ac>/);
        const brightness = brightnessMatch ? parseInt(brightnessMatch[1]) : 0;

        return {
            on: brightness > 0,
            brightness: brightness
        };
    } catch (e) {
        log('Error al parsear XML de WLED: ' + e.message, 'error');
        return null;
    }
}

// =====================================================
// LÓGICA DE SCHEDULER
// =====================================================

function getActiveSchedule() {
    if (!schedulerEnabled || schedules.length === 0) {
        return null;
    }

    // Obtener fecha/hora actual en la zona horaria configurada
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        weekday: 'short'
    });

    const parts = formatter.formatToParts(now);
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
            // Horario normal (mismo día)
            if (schedule.days.includes(currentDay) && currentTime >= startMinutes && currentTime < endMinutes) {
                return schedule;
            }
        } else {
            // Horario overnight (cruza medianoche)
            const prevDay = (currentDay === 0) ? 6 : currentDay - 1;

            // Parte después de medianoche
            if (schedule.days.includes(prevDay) && currentTime >= 0 && currentTime < endMinutes) {
                return schedule;
            }
            // Parte antes de medianoche
            if (schedule.days.includes(currentDay) && currentTime >= startMinutes && currentTime <= 1439) {
                return schedule;
            }
        }
    }

    return null;
}

async function checkSchedules() {
    if (!mqttClient || !mqttClient.connected) {
        return;
    }

    if (!schedulerEnabled) {
        return;
    }

    const activeSchedule = getActiveSchedule();
    const shouldBeOn = activeSchedule !== null;

    // Detectar si es la primera ejecución
    const isFirstRun = lastScheduleState === null;
    if (isFirstRun) {
        lastScheduleState = shouldBeOn;
        log(`Estado inicial del scheduler: ${shouldBeOn ? 'Horario activo' : 'Fuera de horario'}`, 'info');
    }

    // Detectar cambios de estado
    const scheduleStateChanged = !isFirstRun && (lastScheduleState !== shouldBeOn);
    const isOutOfSync = !isFirstRun && (wledIsOn !== shouldBeOn);

    if (scheduleStateChanged || isOutOfSync) {
        if (shouldBeOn && !wledIsOn) {
            // Debe estar encendido pero está apagado
            log(`Horario activo (${activeSchedule.startTime}-${activeSchedule.endTime}) - Encendiendo LEDs`, 'schedule');
            await sendWLEDCommand({
                "on": true,
                "bri": CONFIG.scheduler.defaultBrightness
            });
            wledIsOn = true;
            lastScheduleState = shouldBeOn;
        } else if (!shouldBeOn && wledIsOn) {
            // Debe estar apagado pero está encendido
            log('Fuera de horario - Apagando LEDs', 'schedule');
            await sendWLEDCommand({
                "on": false
            });
            wledIsOn = false;
            lastScheduleState = shouldBeOn;
        }
    }
}

// =====================================================
// ENVÍO DE COMANDOS A WLED
// =====================================================

async function sendWLEDCommand(payload) {
    return new Promise((resolve, reject) => {
        if (!mqttClient || !mqttClient.connected) {
            reject(new Error('MQTT no conectado'));
            return;
        }

        const payloadStr = JSON.stringify(payload);

        mqttClient.publish(CONFIG.mqtt.topic, payloadStr, { qos: 1, retain: false }, (err) => {
            if (err) {
                log('Error al enviar comando WLED: ' + err.message, 'error');
                reject(err);
            } else {
                log(`Comando enviado: ${payloadStr}`, 'success');
                resolve();
            }
        });
    });
}

// =====================================================
// INICIALIZACIÓN
// =====================================================

function start() {
    log('==========================================', 'info');
    log('WLED Christmas Tree Scheduler v1.0', 'info');
    log('==========================================', 'info');
    log(`Zona horaria: ${userTimezone}`, 'info');
    log(`Intervalo de verificación: ${CONFIG.scheduler.checkInterval / 1000}s`, 'info');
    log('', 'info');

    // Conectar a MQTT
    connectMQTT();

    // Iniciar verificación periódica de horarios
    setInterval(() => {
        checkSchedules();
    }, CONFIG.scheduler.checkInterval);

    // Primera verificación después de 5 segundos (dar tiempo a recibir horarios)
    setTimeout(() => {
        log('Iniciando verificación de horarios...', 'info');
        checkSchedules();
    }, 5000);
}

// Manejo de señales de terminación
process.on('SIGINT', () => {
    log('Recibida señal SIGINT, cerrando...', 'warn');
    if (mqttClient) {
        mqttClient.end();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('Recibida señal SIGTERM, cerrando...', 'warn');
    if (mqttClient) {
        mqttClient.end();
    }
    process.exit(0);
});

// Iniciar el servicio
start();
