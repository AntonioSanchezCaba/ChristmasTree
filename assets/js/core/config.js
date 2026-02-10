// =====================================================
// GLOBAL CONFIGURATION & STATE
// =====================================================

// Supabase
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

// MQTT
const MQTT_CONFIG = {
    broker: 'wss://mqtt.vittence.com:8084/mqtt',
    topic: 'wled/tree/api',
    username: '',
    password: ''
};

let mqttClient = null;
let COLOR_ORDER = 'RGB';

// Three.js
let scene, camera, renderer;
let ledGroup;
let ledMeshes = [];
let ledColors = {};
let ledPositions = [];
const totalLeds = 179;

// Paint Mode
let paintMode = false;
let selectedColor = '#ff0000';

// Brightness
let currentBrightness = 128;

// Effects & Animations
let effectAnimationInterval = null;
let localAnimationInterval = null;
let currentEffect = null;
let currentLocalAnimation = null;
let currentEffectId = 0;
let currentPaletteId = 0;

// WLED State
let pendingWLEDState = null;
let ledsReady = false;
let lastProcessedState = null;
let lastProcessedTime = 0;
let initialBrightnessSet = false;
let wledIsOn = false;
let wledStateReceived = false;

// Schedule
let schedules = [];
let schedulerInterval = null;
let lastScheduleState = null;
let userTimezone = 'America/Santo_Domingo';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
