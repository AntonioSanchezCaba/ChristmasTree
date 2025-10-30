# MQTT Privado con URL Corta usando Dominio Propio

## Problema

Tu cluster HiveMQ privado tiene URL muy larga:
```
❌ 90717923c01b4a4da3718559007344ac.s1.eu.hivemq.cloud (52 caracteres)
```

WLED tiene un **límite de caracteres** en el campo del broker y no cabe.

## Solución: Dominio Propio con Alias DNS

**Concepto:** Comprar un dominio corto y crear un alias (CNAME) a tu cluster HiveMQ.

**Resultado:**
```
✅ mqtt.tudominio.com (17-25 caracteres) → Tu cluster HiveMQ privado
```

**Costo:** 8-12€/año (~1€/mes)

**Ventajas:**
- ✅ MQTT privado (tu HiveMQ con usuario/contraseña)
- ✅ URL corta (cabe en WLED)
- ✅ Profesional
- ✅ Control total
- ✅ Un dominio para múltiples usos

---

## Paso 1: Comprar Dominio (15 minutos)

### Opción A: Namecheap (Recomendado - Fácil)

**Enlace:** https://www.namecheap.com

1. **Buscar dominio disponible:**
   - Ve a Namecheap.com
   - Busca dominios cortos con tu nombre/apellido:
     - `antonio.com` (probablemente ocupado)
     - `antoniosanchez.com`
     - `asanchez.net`
     - `sancheztech.com`
     - `tuapellido.dev`
   - **Tip:** Dominios `.com` y `.net` son ~10€/año, `.dev` y `.tech` ~12€/año

2. **Comprar el dominio:**
   - Añade al carrito
   - **IMPORTANTE:** NO compres servicios adicionales (hosting, email, etc.)
   - Solo necesitas el **dominio base**
   - Paga con tarjeta o PayPal

3. **Activar cuenta:**
   - Verifica tu email
   - Completa configuración básica

**Costo aproximado:** 8-12€/año

---

### Opción B: Cloudflare Registrar (Más Barato)

**Enlace:** https://www.cloudflare.com/products/registrar/

**Ventajas:**
- Precio al costo (sin margen de ganancia)
- `.com` por ~9€/año
- DNS gratuito y rápido incluido

**Desventajas:**
- Requiere tarjeta de crédito/débito
- No acepta PayPal

**Pasos:**
1. Crea cuenta en Cloudflare
2. Ve a "Registrar" → "Register Domain"
3. Busca y compra dominio
4. El DNS de Cloudflare ya está configurado automáticamente

---

### Opción C: Google Domains / Squarespace

**Enlace:** https://domains.google.com

**Costo:** ~12€/año

**Ventajas:**
- Interfaz muy simple
- Integración con Google

**Pasos:**
1. Busca dominio
2. Compra
3. Configura DNS (siguiente paso)

---

## Paso 2: Configurar DNS en Cloudflare (10 minutos)

**Por qué Cloudflare:** Aunque compres el dominio en Namecheap, usar DNS de Cloudflare es gratis y más rápido.

### 2.1. Crear cuenta en Cloudflare

1. Ve a: https://www.cloudflare.com
2. Crea cuenta gratuita
3. Verifica email

### 2.2. Añadir tu dominio

1. En el dashboard, click **"Add a Site"** o **"Añadir un sitio"**
2. Introduce tu dominio: `tudominio.com`
3. Selecciona plan **"Free"** (gratis)
4. Click **"Continue"**

### 2.3. Apuntar Nameservers

Cloudflare te dará 2 nameservers como:
```
amit.ns.cloudflare.com
dina.ns.cloudflare.com
```

**Configurar en Namecheap:**

1. Ve a Namecheap.com → Dashboard
2. Click en tu dominio
3. Ve a **"Nameservers"**
4. Selecciona **"Custom DNS"**
5. Introduce los 2 nameservers de Cloudflare:
   ```
   amit.ns.cloudflare.com
   dina.ns.cloudflare.com
   ```
6. Guarda

**Tiempo de propagación:** 2-24 horas (usualmente 1-2 horas)

### 2.4. Crear registro CNAME

Una vez que Cloudflare detecte tu dominio (recibirás email):

1. En Cloudflare Dashboard → Click en tu dominio
2. Ve a **"DNS"** → **"Records"**
3. Click **"Add record"**
4. Configura:
   ```
   Type: CNAME
   Name: mqtt
   Target: 90717923c01b4a4da3718559007344ac.s1.eu.hivemq.cloud
   Proxy status: DNS only (nube GRIS, no naranja)
   TTL: Auto
   ```
5. Click **"Save"**

**Resultado:**
```
mqtt.tudominio.com → 90717923c01b4a4da3718559007344ac.s1.eu.hivemq.cloud
```

### 2.5. Verificar configuración

Espera 5-10 minutos y prueba:

```bash
# Windows (PowerShell o CMD)
nslookup mqtt.tudominio.com

# Linux/Mac
dig mqtt.tudominio.com

# Deberías ver que apunta a tu cluster HiveMQ
```

---

## Paso 3: Configurar WLED (5 minutos)

Ahora que tienes `mqtt.tudominio.com`, configúralo en WLED:

1. **Accede a WLED:** `http://192.168.1.100`
2. **Ve a:** Config → Sync Interfaces → MQTT
3. **Configura:**

```
┌─────────────────────────────────────────────┐
│ Enable MQTT              [✓]                │
│                                             │
│ Broker:                                     │
│ [mqtt.tudominio.com________________]       │ ← Tu dominio corto
│                                             │
│ Port:                                       │
│ [8883___]                                   │ ← SSL (recomendado)
│                                             │
│ Username:                                   │
│ [wled_user_________________________]       │ ← Tu usuario HiveMQ
│                                             │
│ Password:                                   │
│ [WledMqtt2024!_____________________]       │ ← Tu contraseña HiveMQ
│                                             │
│ Client ID:                                  │
│ [wled_tree_antonio_____________]           │ ← ID único
│                                             │
│ Device Topic:                               │
│ [wled/tree_____________________]           │ ← Tu topic
│                                             │
│ Group Topic:                                │
│ [wled/all______________________]           │ ← Topic de grupo
│                                             │
└─────────────────────────────────────────────┘
```

**IMPORTANTE:**
- Puerto: **8883** (con SSL/TLS)
- Usuario y contraseña: Los que configuraste en HiveMQ
- No dejes espacios antes/después

4. **Click "Save"**
5. **Espera 10-20 segundos** (WLED se reinicia)

---

## Paso 4: Configurar la Web App (2 minutos)

Abre `index.html` y busca la configuración MQTT (línea ~598):

```javascript
} else if (connectionMode === 'mqtt-hivemq') {
    // Tu cluster HiveMQ con dominio corto
    broker = 'wss://mqtt.tudominio.com:8884/mqtt';  // ← Cambia aquí
    username = 'wled_user';
    password = 'WledMqtt2024!';
}
```

**Guarda el archivo.**

---

## Paso 5: Probar Conexión

### 5.1. Verificar WLED

1. Abre WLED: `http://192.168.1.100`
2. Ve a **Info**
3. Busca sección **MQTT**
4. Debería decir: **"Connected"** o **"Conectado"**

Si dice **"Error"** o **"Disconnected"**:
- Espera 5 minutos más (DNS puede tardar)
- Verifica que el CNAME esté configurado correctamente
- Verifica usuario y contraseña

### 5.2. Probar desde la Web

1. Abre `index.html` en tu navegador
2. Selecciona modo **"MQTT HiveMQ"**
3. Debería aparecer **"✅ Conectado a MQTT"**
4. Cambia un color
5. El árbol debería cambiar de color

**¡Funciona!** 🎉

---

## Configuración Completa - Resumen

| Componente | Valor |
|------------|-------|
| **Dominio** | `mqtt.tudominio.com` |
| **Apunta a** | `90717923...hivemq.cloud` |
| **Puerto WLED** | 8883 (SSL) |
| **Puerto Web** | 8884 (WSS) |
| **Usuario** | `wled_user` |
| **Contraseña** | `WledMqtt2024!` |
| **Device Topic** | `wled/tree` |

---

## Alternativas de Dominios Baratos

Si quieres gastar menos:

### Dominios económicos (2-5€/año):

- **.xyz** → 1-2€/año (primer año, luego ~10€)
- **.icu** → 1€/año (primer año, luego ~8€)
- **.online** → 3€/año
- **.site** → 2€/año
- **.fun** → 2€/año

**Ejemplos:**
```
mqtt.antonio.xyz
mqtt.casa.online
mqtt.luces.fun
```

**Sitios para buscar:**
- [Namecheap](https://www.namecheap.com)
- [Porkbun](https://porkbun.com) - Muy barato
- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)

**IMPORTANTE:** Verifica el precio de renovación (segundo año), no solo el primero.

---

## Solución de Problemas

### DNS no resuelve

**Síntoma:** `nslookup mqtt.tudominio.com` no responde o da error

**Soluciones:**

1. **Espera más tiempo:**
   - Los cambios DNS pueden tardar hasta 24 horas
   - Usualmente 1-2 horas

2. **Verifica nameservers:**
   ```bash
   nslookup -type=NS tudominio.com
   ```
   Deben aparecer los nameservers de Cloudflare

3. **Verifica CNAME:**
   - En Cloudflare → DNS
   - El registro CNAME debe existir
   - **Proxy status debe estar en GRIS** (DNS only), no naranja

4. **Limpia caché DNS:**
   ```bash
   # Windows
   ipconfig /flushdns

   # Linux
   sudo systemd-resolve --flush-caches

   # Mac
   sudo dscacheutil -flushcache
   ```

---

### WLED no conecta

**Síntoma:** WLED → Info → MQTT dice "Disconnected" o "Error"

**Soluciones:**

1. **Verifica que DNS funcione:**
   ```bash
   nslookup mqtt.tudominio.com
   ```
   Debe responder con la IP de HiveMQ

2. **Verifica puerto:**
   - Debe ser: **8883** (con SSL)
   - NO 1883 (sin SSL)
   - NO 8884 (ese es para WebSocket)

3. **Verifica usuario y contraseña:**
   - Deben ser exactamente los de HiveMQ
   - Sin espacios antes/después
   - Mayúsculas y minúsculas importan

4. **Prueba con la URL larga:**
   - Temporalmente usa la URL completa de HiveMQ
   - Si funciona, el problema es el DNS
   - Si no funciona, el problema es usuario/contraseña

5. **Verifica SSL en HiveMQ:**
   - Ve a HiveMQ Console
   - Settings → Verify que SSL esté habilitado

---

### La web no conecta

**Síntoma:** La web dice "Error MQTT"

**Soluciones:**

1. **Verifica puerto WebSocket:**
   ```javascript
   // CORRECTO:
   broker = 'wss://mqtt.tudominio.com:8884/mqtt';

   // INCORRECTO:
   broker = 'wss://mqtt.tudominio.com:8883/mqtt';  // Puerto equivocado
   ```

2. **Verifica protocolo:**
   - Debe empezar con `wss://` (WebSocket Secure)
   - NO `ws://` (sin SSL)
   - NO `mqtt://` (TCP, no WebSocket)

3. **Abre consola del navegador:**
   - F12 → Console
   - Busca errores WebSocket
   - Si dice "SSL handshake failed", verifica el puerto

---

## Costos Totales

| Opción | Primer Año | Años Siguientes |
|--------|-----------|----------------|
| **Dominio .com** | 10€ | 10€/año |
| **Dominio .xyz** | 2€ | 10€/año |
| **Dominio .dev** | 12€ | 12€/año |
| **Cloudflare DNS** | Gratis | Gratis |
| **HiveMQ Cloud** | Gratis | Gratis |
| **Total** | **2-12€** | **2-12€/año** |

**Comparado con:**
- VPS privado: 36-48€/año (~3-4€/mes)
- Port Forwarding: Gratis (pero no tienes acceso)

---

## ¿Vale la Pena?

**Sí**, si valoras:
- ✅ MQTT privado (seguro, con autenticación)
- ✅ Sin dependencia de servicios públicos
- ✅ Solución profesional
- ✅ Un dominio propio (puedes usarlo para otras cosas)

**No**, si:
- ❌ No quieres gastar nada
- ❌ MQTT público con topic aleatorio es suficiente
- ❌ Prefieres soluciones temporales

---

## Alternativa Gratuita: MQTT Público con Topic Imposible de Adivinar

Si 10€/año es demasiado, tu alternativa es:

```
Broker: test.mosquitto.org (público)
Device Topic: wled/kP9xM2nQ7vL4wR3aB8yT5cZ1fG6hJ/tree1
              ↑
              Token aleatorio de 32 caracteres
```

**Seguridad:**
- Probabilidad de adivinar: 1 en 62^32 (más seguro que cualquier contraseña)
- Nadie puede acceder sin conocer el topic exacto

**Generar token:**
```bash
# Linux/Mac
openssl rand -base64 24 | tr -d '/+=' | head -c 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

Ejemplo: `wled/A7kM9pL3nQ8xR2vW6yT1cZ4fG5hJ0bS/tree1`

---

## Recomendación Final

Para tu caso específico (sin acceso al router, MQTT privado, sin dispositivos adicionales):

### 🥇 Opción 1: Dominio Propio (10€/año)
- Profesional
- MQTT privado con HiveMQ
- URL corta
- Control total

### 🥈 Opción 2: MQTT Público + Topic Aleatorio (Gratis)
- Gratis
- Prácticamente imposible de hackear
- Funciona igual de bien

**Mi recomendación:** Si puedes permitirte 10€/año, ve con la **Opción 1**. Es la solución profesional y limpia.

Si 10€ es mucho, la **Opción 2** es completamente válida y segura en la práctica.

---

## Próximos Pasos

**Si eliges Dominio Propio:**

1. ✅ Compra dominio (15 min) → Namecheap o Cloudflare
2. ✅ Configura DNS en Cloudflare (10 min)
3. ✅ Espera propagación (1-2 horas)
4. ✅ Configura WLED (5 min)
5. ✅ Actualiza web app (2 min)
6. ✅ ¡Funciona! 🎉

**Tiempo total:** ~30 minutos + espera DNS

¿Quieres que te ayude con algún paso específico?
