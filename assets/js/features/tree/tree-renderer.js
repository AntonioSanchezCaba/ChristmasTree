// =====================================================
// THREE.JS RENDERER - Scene, Camera, Tree Geometry, LEDs
// =====================================================

// ===== LED VISUAL UPDATES =====

async function updateLEDColor(index, color) {
    if (index < 0 || index >= totalLeds) return;
    ledColors[index] = color;
    updateLEDVisual(index, color, true);

    const rgb = hexToRgb(color);
    if (!rgb) return;

    const orderedRgb = applyColorOrder(rgb.r, rgb.g, rgb.b);
    await sendMQTTCommand({
        "on": true,
        "seg": [{
            "fx": 0,
            "i": [index, orderedRgb]
        }]
    });
}

function updateLEDVisual(index, color, needsUpdate = true) {
    if (index < 0 || index >= totalLeds || !ledMeshes[index]) return;
    const mesh = ledMeshes[index];
    mesh.material.color.set(color);

    if (needsUpdate) {
        mesh.material.needsUpdate = true;
    }
}

function updateAllLEDsVisual(color) {
    for (let i = 0; i < totalLeds; i++) {
        ledColors[i] = color;
        updateLEDVisual(i, color, false);
    }

    ledMeshes.forEach(mesh => {
        mesh.material.needsUpdate = true;
    });
}

// ===== THREE.JS INITIALIZATION =====

function initThreeJS() {
    const canvas = document.getElementById('treeCanvas');
    scene = new THREE.Scene();
    scene.background = null;

    camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 8, 25);
    camera.lookAt(0, 8, 0);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(0, 25, 20);
    scene.add(pointLight);

    createChristmasTree();

    // Mouse drag rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', () => { isDragging = true; });
    canvas.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaMove = {
                x: e.offsetX - previousMousePosition.x,
                y: e.offsetY - previousMousePosition.y
            };
            ledGroup.rotation.y += deltaMove.x * 0.01;
            ledGroup.rotation.x += deltaMove.y * 0.01;
        }
        previousMousePosition = { x: e.offsetX, y: e.offsetY };
    });
    canvas.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('click', onCanvasClick);

    window.addEventListener('resize', onWindowResize);

    animate();
}

// ===== TREE GEOMETRY =====

function createStarShape() {
    const shape = new THREE.Shape();
    const outerRadius = 0.5;
    const innerRadius = 0.2;
    const points = 5;

    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
            shape.moveTo(x, y);
        } else {
            shape.lineTo(x, y);
        }
    }
    shape.closePath();
    return shape;
}

function createChristmasTree() {
    ledGroup = new THREE.Group();
    const treeHeight = 17;
    const treeRadius = 7;

    // Tree cone
    const treeGeometry = new THREE.ConeGeometry(treeRadius, treeHeight, 32);
    const treeMaterial = new THREE.MeshPhongMaterial({
        color: 0x0a4d0a,
        transparent: true,
        opacity: 0.7
    });
    const treeMesh = new THREE.Mesh(treeGeometry, treeMaterial);
    treeMesh.position.y = treeHeight / 2;
    ledGroup.add(treeMesh);

    // Star on top
    const starShape = createStarShape();
    const extrudeSettings = {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 2
    };
    const starGeometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    const starMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffdd00,
        emissiveIntensity: 0.4,
        shininess: 100,
        specular: 0xffffff
    });
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    starMesh.position.y = treeHeight + 0.8;
    starMesh.position.x = 0;
    starMesh.position.z = 0;
    starMesh.rotation.y = Math.PI / 10;
    starMesh.rotation.z = 0;
    ledGroup.add(starMesh);

    // LED spheres
    const ledsPerLayer = 9;
    const layers = Math.ceil(totalLeds / ledsPerLayer);

    let ledIndex = 0;
    for (let layer = 0; layer < layers && ledIndex < totalLeds; layer++) {
        const ledsInThisLayer = Math.min(ledsPerLayer, totalLeds - ledIndex);
        for (let i = 0; i < ledsInThisLayer; i++) {
            const angleOffset = (i / ledsInThisLayer) * (Math.PI * 2);
            const y = (layer / layers) * treeHeight;
            const radiusAtHeight = treeRadius * (1 - (y / treeHeight));
            const spiralOffset = layer * 0.4;
            const x = Math.cos(angleOffset + spiralOffset) * radiusAtHeight;
            const z = Math.sin(angleOffset + spiralOffset) * radiusAtHeight;

            const ledGeometry = new THREE.SphereGeometry(0.2, 8, 8);
            const ledMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
            const ledMesh = new THREE.Mesh(ledGeometry, ledMaterial);

            ledMesh.position.set(x, y, z);
            ledMesh.userData.ledIndex = ledIndex;
            ledGroup.add(ledMesh);
            ledMeshes.push(ledMesh);
            ledColors[ledIndex] = '#333333';
            ledPositions[ledIndex] = { x, y, z };

            ledIndex++;
        }
    }

    scene.add(ledGroup);

    ledsReady = true;
    addDebugLog(totalLeds + ' LEDs creados y listos', 'success');

    // Apply pending WLED state if any
    if (pendingWLEDState) {
        addDebugLog('Aplicando estado pendiente de WLED...', 'info');
        handleWLEDState(pendingWLEDState);
        pendingWLEDState = null;
    }
}

// ===== INTERACTION & ANIMATION LOOP =====

function onCanvasClick(event) {
    if (!paintMode) return;
    const canvas = document.getElementById('treeCanvas');
    const rect = canvas.getBoundingClientRect();

    const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(ledMeshes);
    if (intersects.length > 0) {
        const clickedLED = intersects[0].object;
        const ledIndex = clickedLED.userData.ledIndex;
        updateLEDColor(ledIndex, selectedColor);
    }
}

function animate() {
    requestAnimationFrame(animate);
    ledGroup.rotation.y += 0.001;
    renderer.render(scene, camera);
}

function onWindowResize() {
    const canvas = document.getElementById('treeCanvas');
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
}
