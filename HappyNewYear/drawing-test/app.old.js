import * as THREE from 'three';
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { RGBELoader } from "jsm/loaders/RGBELoader.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "jsm/postprocessing/ShaderPass.js";

// --- 0. 레이아웃 설정 ---
const HALF_WIDTH = window.innerWidth / 2;
const FULL_HEIGHT = window.innerHeight;

// --- 1. 왼쪽 패널 (평면 이미지) ---
const leftPanel = document.getElementById('left-panel');
const leftCanvas = document.getElementById('left-canvas');
leftCanvas.width = Math.floor(HALF_WIDTH);
leftCanvas.height = Math.floor(FULL_HEIGHT);

const sceneLeft = new THREE.Scene();
sceneLeft.background = new THREE.Color(0x1a1a1a);

const cameraLeft = new THREE.OrthographicCamera(
    -HALF_WIDTH / 2, 
    HALF_WIDTH / 2, 
    FULL_HEIGHT / 2, 
    -FULL_HEIGHT / 2, 
    0.1, 
    1000
);
cameraLeft.position.z = 10;

const rendererLeft = new THREE.WebGLRenderer({ antialias: true, canvas: leftCanvas });
rendererLeft.setSize(Math.floor(HALF_WIDTH), Math.floor(FULL_HEIGHT));
rendererLeft.toneMapping = THREE.ACESFilmicToneMapping;
rendererLeft.toneMappingExposure = 1.0;

// --- 2. 오른쪽 패널 (3D 큐브) ---
const rightPanel = document.getElementById('right-panel');
const rightCanvas = document.createElement('canvas');
rightCanvas.width = Math.floor(HALF_WIDTH);
rightCanvas.height = Math.floor(FULL_HEIGHT);
rightPanel.appendChild(rightCanvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, HALF_WIDTH / FULL_HEIGHT, 0.1, 1000);
camera.position.set(0, 0, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: rightCanvas });
renderer.setSize(Math.floor(HALF_WIDTH), Math.floor(FULL_HEIGHT));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// --- Post-Processing Setup (Composer) ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// [Custom Curves Shader]
const CurvesShader = {
    uniforms: {
        tDiffuse: { value: null },
        p0: { value: 0.5 }, p1: { value: 0.5 }, p2: { value: 0.5 },
        p3: { value: 0.5 }, p4: { value: 0.5 }, p5: { value: 0.5 }, p6: { value: 0.5 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float p0, p1, p2, p3, p4, p5, p6;
      varying vec2 vUv;
      float applyCurve(float x, float p0, float p1, float p2, float p3, float p4, float p5, float p6) {
        float result = x;
        if (x < 1.0/6.0) result = mix(p0, p1, x * 6.0);
        else if (x < 2.0/6.0) result = mix(p1, p2, (x - 1.0/6.0) * 6.0);
        else if (x < 3.0/6.0) result = mix(p2, p3, (x - 2.0/6.0) * 6.0);
        else if (x < 4.0/6.0) result = mix(p3, p4, (x - 3.0/6.0) * 6.0);
        else if (x < 5.0/6.0) result = mix(p4, p5, (x - 4.0/6.0) * 6.0);
        else result = mix(p5, p6, (x - 5.0/6.0) * 6.0);
        return clamp(result, 0.0, 1.0);
      }
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        color.r = applyCurve(color.r, p0, p1, p2, p3, p4, p5, p6);
        color.g = applyCurve(color.g, p0, p1, p2, p3, p4, p5, p6);
        color.b = applyCurve(color.b, p0, p1, p2, p3, p4, p5, p6);
        gl_FragColor = color;
      }
    `
};

// [Custom Color Balance Shader]
const ColorBalanceShader = {
    uniforms: {
        tDiffuse: { value: null },
        u_shadows: { value: new THREE.Vector3(0, 0, 0) },
        u_midtones: { value: new THREE.Vector3(0, 0, 0) },
        u_highlights: { value: new THREE.Vector3(0, 0, 0) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec3 u_shadows;
      uniform vec3 u_midtones;
      uniform vec3 u_highlights;
      varying vec2 vUv;
      float getLuminance(vec3 color) { return dot(color, vec3(0.2126, 0.7152, 0.0722)); }
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 color = texel.rgb;
        float lum = getLuminance(color);
        float shadowFactor = 1.0 - smoothstep(0.0, 0.4, lum);
        float highlightFactor = smoothstep(0.6, 1.0, lum);
        float midtoneFactor = clamp(1.0 - shadowFactor - highlightFactor, 0.0, 1.0);
        color += u_shadows * shadowFactor + u_midtones * midtoneFactor + u_highlights * highlightFactor;
        gl_FragColor = vec4(color, texel.a);
      }
    `
};

const curvesPass = new ShaderPass(CurvesShader);
curvesPass.uniforms['p0'].value = 0.0;
curvesPass.uniforms['p1'].value = 0.1;
curvesPass.uniforms['p2'].value = 0.3;
curvesPass.uniforms['p3'].value = 0.65;
curvesPass.uniforms['p4'].value = 0.9;
curvesPass.uniforms['p5'].value = 1.0;
curvesPass.uniforms['p6'].value = 1.3;

const colorBalancePass = new ShaderPass(ColorBalanceShader);
colorBalancePass.uniforms.u_shadows.value.set(0.1, 0.06, 0.0);
colorBalancePass.uniforms.u_midtones.value.set(0.03, 0.03, 0.0);
colorBalancePass.uniforms.u_highlights.value.set(0.0, 0.0, 0.0);

composer.addPass(curvesPass);
composer.addPass(colorBalancePass);

const ctrls = new OrbitControls(camera, renderer.domElement);
ctrls.enableDamping = true;

// --- 3. 오버레이 그리기 캔버스 (왼쪽 위) ---
const UI_CANVAS_SIZE = 256;
const uiCanvas = document.getElementById('ui-canvas');
uiCanvas.width = UI_CANVAS_SIZE;
uiCanvas.height = UI_CANVAS_SIZE;
const uiContext = uiCanvas.getContext('2d');
uiContext.fillStyle = '#000000';
uiContext.fillRect(0, 0, uiCanvas.width, uiCanvas.height);

// --- 4. 내부 작업용 캔버스 ---
// 렌더링 해상도는 절반 화면 크기
const CANVAS_WIDTH = Math.floor(HALF_WIDTH);
const CANVAS_HEIGHT = Math.floor(FULL_HEIGHT);

const heightCanvas = document.createElement('canvas');
heightCanvas.width = CANVAS_WIDTH;
heightCanvas.height = CANVAS_HEIGHT;
const heightContext = heightCanvas.getContext('2d');

const maskingCanvas = document.createElement('canvas');
maskingCanvas.width = CANVAS_WIDTH;
maskingCanvas.height = CANVAS_HEIGHT;
const maskingContext = maskingCanvas.getContext('2d');

const tempCanvas = document.createElement('canvas');
tempCanvas.width = CANVAS_WIDTH;
tempCanvas.height = CANVAS_HEIGHT;
const tempContext = tempCanvas.getContext('2d');

const normalCanvas = document.createElement('canvas');
normalCanvas.width = CANVAS_WIDTH;
normalCanvas.height = CANVAS_HEIGHT;
const normalContext = normalCanvas.getContext('2d');

const aoCanvas = document.createElement('canvas');
aoCanvas.width = CANVAS_WIDTH;
aoCanvas.height = CANVAS_HEIGHT;
const aoContext = aoCanvas.getContext('2d');

const displacementTexture = new THREE.CanvasTexture(heightCanvas);
const normalTexture = new THREE.CanvasTexture(normalCanvas);
const aoTexture = new THREE.CanvasTexture(aoCanvas);

// --- 4. Load Assets ---
const texLoader = new THREE.TextureLoader();
const path = './assets/textures/Snow001_4K-JPG/Snow001_4K-JPG_';

const baseMap = texLoader.load(`${path}Color.jpg`);
const roughnessMap = texLoader.load(`${path}Roughness.jpg`, (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
});

const snowNormalImage = new Image();
snowNormalImage.crossOrigin = "Anonymous";
snowNormalImage.src = `${path}NormalGL.jpg`;

// 평평한 마스크 이미지 (전체 흰색)
const maskImage = document.createElement('canvas');
maskImage.width = CANVAS_WIDTH;
maskImage.height = CANVAS_HEIGHT;
const maskImageCtx = maskImage.getContext('2d');
maskImageCtx.fillStyle = '#ffffff';
maskImageCtx.fillRect(0, 0, maskImage.width, maskImage.height);

let assetsLoaded = 0;
const onAssetLoad = () => {
    assetsLoaded++;
    if (assetsLoaded >= 1) updateTextures(true);
};
snowNormalImage.onload = onAssetLoad;

// --- 5. Material (중앙 그리기 영역) ---
const material = new THREE.MeshPhysicalMaterial({
    map: baseMap,
    // [중요] 텍스처 본연의 색을 쓰기 위해 color 속성 제거 (기본값 0xffffff 사용)
    
    displacementMap: displacementTexture,
    displacementScale: 0.3,  // 양수: 눈을 쌓아 올림
    displacementBias: 0,
    
    normalMap: normalTexture,
    
    aoMap: aoTexture,
    aoMapIntensity: 1.0,
    
    roughnessMap: roughnessMap,
    roughness: 0.8,
    metalness: 0.1,
    
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    
    opacity: 1,  // 투명도 조절 (0~1, 0=투명, 1=불투명)
    transparent: true,
});

// Z-Fighting 방지
material.polygonOffset = true;
material.polygonOffsetFactor = -1; 
material.polygonOffsetUnits = -1;



// --- 배경 메시 (중앙 영역에만 적용) ---
const bgLoader = new THREE.TextureLoader();
const bgBaseMap = bgLoader.load(`${path}Color.jpg`);
const bgNormalMap = bgLoader.load(`${path}NormalGL.jpg`); 
const bgRoughnessMap = bgLoader.load(`${path}Roughness.jpg`);

// 타일링 제거 (반복되지 않게)
[bgBaseMap, bgNormalMap, bgRoughnessMap].forEach(tex => {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
});

const bgMaterial = new THREE.MeshPhysicalMaterial({
    map: bgBaseMap,
    normalMap: normalTexture,
    roughnessMap: bgRoughnessMap,
    
    displacementMap: displacementTexture,
    displacementScale: 0.3,  // 양수: 눈을 쌓아 올림
    displacementBias: 0,
    
    aoMap: aoTexture,
    aoMapIntensity: 1.0,
    
    roughness: 0.8,
    metalness: 0.1,
    
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    
    opacity: 1,  // 반투명도 조절 (0~1, 0=투명, 1=불투명)
    transparent: true,
});

// --- 5-1. 왼쪽 패널용 평면 메시 (높이맵 표시) ---
const leftMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(heightCanvas),
    side: THREE.FrontSide,
});

const leftGeometry = new THREE.PlaneGeometry(HALF_WIDTH, FULL_HEIGHT);
const leftMesh = new THREE.Mesh(leftGeometry, leftMaterial);
leftMesh.position.set(0, 0, 0);
sceneLeft.add(leftMesh);

// 높이맵이 업데이트될 때마다 텍스처도 업데이트
const leftTexture = leftMaterial.map;

// --- 5-2. 오른쪽 패널용 3D 메시 (기존 큐브) ---
const geometry = new THREE.PlaneGeometry(10, 10, 256, 256);
const cube = new THREE.Mesh(geometry, bgMaterial);
cube.castShadow = true;
cube.receiveShadow = true;
scene.add(cube);

bgMaterial.polygonOffset = true;
bgMaterial.polygonOffsetFactor = -1; 
bgMaterial.polygonOffsetUnits = -1;

const bgGeometry = new THREE.PlaneGeometry(10, 10);
const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);

// cube 뒤에 배치 (투명한 cube를 통해 배경이 보이도록)
bgMesh.position.z = -0.02;

bgMesh.receiveShadow = true;
bgMesh.castShadow = false; 
// scene.add(bgMesh);  // 배경 메시 비활성화 (cube가 배경 텍스처를 포함)

// --- 6. Lights ---
const mainLight = new THREE.PointLight(0xffffff, 0.3, 100);
mainLight.position.set(2, -4, 4); 
mainLight.castShadow = true;
mainLight.shadow.bias = -0.0001;
scene.add(mainLight);

const rgbeLoader = new RGBELoader();
rgbeLoader.load('./assets/textures/0_hdri/snowy_cemetery_4k.hdr', (texture) => {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.background = envMap;
    scene.environment = envMap;
    pmremGenerator.dispose();
});

// --- 7. Utility ---
function heightToNormal(srcCanvas, dstContext, intensity) {
    const width = srcCanvas.width;
    const height = srcCanvas.height;
    const srcCtx = srcCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, width, height);
    const dstData = dstContext.createImageData(width, height);
    const srcPixels = srcData.data;
    const dstPixels = dstData.data;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const x1 = (x > 0) ? srcPixels[idx - 4] : srcPixels[idx];
            const x2 = (x < width - 1) ? srcPixels[idx + 4] : srcPixels[idx];
            const y1 = (y > 0) ? srcPixels[idx - width * 4] : srcPixels[idx];
            const y2 = (y < height - 1) ? srcPixels[idx + width * 4] : srcPixels[idx];
            const dX = (x1 - x2) * intensity;
            const dY = (y1 - y2) * intensity;
            const dZ = 255 / Math.abs(intensity);
            const len = Math.sqrt(dX * dX + dY * dY + dZ * dZ);
            dstPixels[idx] = ((dX / len) + 1) * 127.5;
            dstPixels[idx + 1] = ((dY / len) + 1) * 127.5;
            dstPixels[idx + 2] = ((dZ / len) + 1) * 127.5;
            dstPixels[idx + 3] = 255;
        }
    }
    dstContext.putImageData(dstData, 0, 0);
}

// --- 9. Drawing Configuration ---
const LINE_RADIUS = 4;  // 선 굵기 조정 (5~15 권장)// --- 8. Drawing Logic ---
let isDrawing = false;
let lastX = 0;
let lastY = 0;

function updateTextures(fullUpdate = false) {
    const width = tempCanvas.width;
    const height = tempCanvas.height;

    // 1. 임시 캔버스 (UI 그리기) - 오버레이 캔버스를 작업 캔버스로 스케일링
    tempContext.globalCompositeOperation = 'source-over';
    tempContext.fillStyle = '#000000';
    tempContext.fillRect(0, 0, width, height);
    
    // uiCanvas (UI_CANVAS_SIZE x UI_CANVAS_SIZE)를 tempCanvas 전체로 스케일링
    tempContext.drawImage(
        uiCanvas,
        0, 0, UI_CANVAS_SIZE, UI_CANVAS_SIZE,  // 소스: 전체 오버레이 캔버스
        0, 0, width, height  // 대상: tempCanvas 전체
    );
    
    // fullUpdate가 아닐 때는 빠른 업데이트만 수행
    if (!fullUpdate) {
        // 빠른 경로: heightMap만 업데이트
        heightContext.globalCompositeOperation = 'source-over';
        heightContext.fillStyle = '#000000';
        heightContext.fillRect(0, 0, width, height);
        
        if (maskImage.complete && maskImage.naturalWidth > 0) {
            heightContext.globalAlpha = 0.7;
            heightContext.drawImage(maskImage, 0, 0, width, height);
            heightContext.globalAlpha = 1.0;
        }
        heightContext.drawImage(tempCanvas, 0, 0);
        
        // 색상 반전
        const hData = heightContext.getImageData(0, 0, width, height);
        const pixels = hData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            const val = pixels[i];
            const inv = 255 - val;
            pixels[i] = inv;
            pixels[i+1] = inv;
            pixels[i+2] = inv;
        }
        heightContext.putImageData(hData, 0, 0);
        
        displacementTexture.needsUpdate = true;
        leftTexture.needsUpdate = true;
        return;  // 빠른 종료
    }
    
    // fullUpdate: 전체 업데이트 수행
    // 2. 마스킹 캔버스 처리
    maskingContext.globalCompositeOperation = 'source-over';
    maskingContext.fillStyle = '#000000';
    maskingContext.fillRect(0, 0, width, height);
    
    if (maskImage.complete && maskImage.naturalWidth > 0) {
        maskingContext.drawImage(maskImage, 0, 0, width, height);
        maskingContext.globalCompositeOperation = 'multiply';
        maskingContext.drawImage(tempCanvas, 0, 0);
        maskingContext.globalCompositeOperation = 'source-over';
    }

    // 3. Height Map 기본 생성 (블러 & 마스크)
    heightContext.globalCompositeOperation = 'source-over';
    heightContext.fillStyle = '#000000';
    heightContext.fillRect(0, 0, width, height);
    
    heightContext.filter = 'blur(2px)'; 
    heightContext.globalCompositeOperation = 'screen'; 
    if (maskImage.complete && maskImage.naturalWidth > 0) {
        heightContext.globalAlpha = 0.7;
        heightContext.drawImage(maskImage, 0, 0, width, height);
        heightContext.globalAlpha = 1.0; 
        heightContext.drawImage(maskingCanvas, 0, 0);
    }
    heightContext.filter = 'none';

    // 4. 색상 반전 (흰색=눈, 검정=파인 트랙)
    const hData = heightContext.getImageData(0,0, width, height);
    const pixels = hData.data;
    for(let i=0; i<pixels.length; i+=4) {
        const val = pixels[i];
        const inv = 255 - val;
        pixels[i] = inv;
        pixels[i+1] = inv;
        pixels[i+2] = inv;
    }
    heightContext.putImageData(hData, 0, 0);

    // 5. AO Map 저장
    aoContext.globalCompositeOperation = 'source-over';
    aoContext.drawImage(heightCanvas, 0, 0);
    aoTexture.needsUpdate = true;

    displacementTexture.needsUpdate = true;
    leftTexture.needsUpdate = true;

    // 6. Normal Map 생성 (최종 Height Map 기준)
    heightToNormal(heightCanvas, normalContext, 3.0);
    normalTexture.needsUpdate = true;
}

// --- 9. Apply Normal Map Button Handler ---
function applyDrawingNormalMap() {
    updateTextures();
    // heightCanvas (왼쪽 패널의 이미지)를 maskImage로 마스킹처리
    const width = heightCanvas.width;
    const height = heightCanvas.height;
    
    // 마스킹된 heightCanvas를 생성
    const maskedHeightCanvas = document.createElement('canvas');
    maskedHeightCanvas.width = width;
    maskedHeightCanvas.height = height;
    const maskedHeightContext = maskedHeightCanvas.getContext('2d');
    
    // 배경을 검은색으로 채우기
    maskedHeightContext.fillStyle = '#000000';
    maskedHeightContext.fillRect(0, 0, width, height);
    
    // maskImage에 왼쪽 패널에서 그려진 이미지 복사
    const maskCtx = maskImage.getContext('2d');
    maskCtx.clearRect(0, 0, width, height);
    maskCtx.drawImage(heightCanvas, 0, 0);
    
    // maskImage를 먼저 그리기
    if (maskImage.complete && maskImage.naturalWidth > 0) {
        maskedHeightContext.drawImage(maskImage, 0, 0, width, height);
        // multiply 모드로 heightCanvas를 그리기 (maskImage 모양만 남음)
        maskedHeightContext.globalCompositeOperation = 'multiply';
        maskedHeightContext.drawImage(heightCanvas, 0, 0);
        maskedHeightContext.globalCompositeOperation = 'source-over';
    }
    
    // 마스킹된 heightCanvas를 Normal Map으로 변환
    const tempNormalCanvas = document.createElement('canvas');
    tempNormalCanvas.width = width;
    tempNormalCanvas.height = height;
    const tempNormalContext = tempNormalCanvas.getContext('2d');
    heightToNormal(maskedHeightCanvas, tempNormalContext, 6.0);
    
    // bgNormalMap을 overlay로 추가 (배경 노말맵과 blend)
    if (bgNormalMap.complete && bgNormalMap.naturalWidth > 0) {
        tempNormalContext.globalCompositeOperation = 'overlay';
        tempNormalContext.drawImage(bgNormalMap, 0, 0, width, height);
        tempNormalContext.globalCompositeOperation = 'source-over';
    }
    
    // snowNormalImage도 overlay로 추가
    if (snowNormalImage.complete && snowNormalImage.naturalWidth > 0) {
        tempNormalContext.globalCompositeOperation = 'overlay';
        tempNormalContext.drawImage(snowNormalImage, 0, 0, width, height);
        tempNormalContext.globalCompositeOperation = 'source-over';
    }
    
    // normalContext에 생성된 normal map을 overlay로 더하기
    normalContext.globalCompositeOperation = 'overlay';
    normalContext.drawImage(tempNormalCanvas, 0, 0);
    normalContext.globalCompositeOperation = 'source-over';
    
    normalTexture.needsUpdate = true;
    console.log('Normal map applied!');
}

// 버튼 이벤트 리스너 추가
const applyButton = document.getElementById('apply-button');
if (applyButton) {
    applyButton.addEventListener('click', applyDrawingNormalMap);
}

uiCanvas.addEventListener('mousedown', (event) => {
    // 오버레이 캔버스 범위 확인
    const rect = uiCanvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) {
        return;
    }
    
    isDrawing = true;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    lastX = x;
    lastY = y;
});

uiCanvas.addEventListener('mouseup', () => {
    isDrawing = false;
});

uiCanvas.addEventListener('mousemove', (event) => {
    if (!isDrawing) return;
    
    // 오버레이 캔버스 범위 확인
    const rect = uiCanvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) {
        return;
    }
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // 이전 좌표와 현재 좌표 사이의 거리 계산
    const dx = x - lastX;
    const dy = y - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 거리에 따라 중간 점들을 그립니다 (선 반지름의 절반 간격)
    const steps = Math.ceil(distance / (LINE_RADIUS * 0.5));
    
    uiContext.fillStyle = '#ffffff';
    uiContext.shadowBlur = 0;
    
    for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const interpX = lastX + dx * t;
        const interpY = lastY + dy * t;
        
        uiContext.beginPath();
        uiContext.arc(interpX, interpY, LINE_RADIUS, 0, Math.PI * 2);
        uiContext.fill();
    }

    lastX = x;
    lastY = y;
    
    // 실시간으로 왼쪽 패널 업데이트
    updateTextures(false);
});

// --- 10. Loop ---
function animate() {
    requestAnimationFrame(animate);
    
    // 왼쪽 패널 렌더링 (평면 이미지)
    rendererLeft.render(sceneLeft, cameraLeft);
    
    // 오른쪽 패널 렌더링 (3D 큐브)
    ctrls.update();
    composer.render();
}
animate();

window.addEventListener('resize', () => {
    const newHalfWidth = window.innerWidth / 2;
    const newHeight = window.innerHeight;
    
    // 왼쪽 렌더러 리사이징
    rendererLeft.setSize(Math.floor(newHalfWidth), Math.floor(newHeight));
    cameraLeft.left = -newHalfWidth / 2;
    cameraLeft.right = newHalfWidth / 2;
    cameraLeft.top = newHeight / 2;
    cameraLeft.bottom = -newHeight / 2;
    cameraLeft.updateProjectionMatrix();
    
    // 오른쪽 렌더러 리사이징
    renderer.setSize(Math.floor(newHalfWidth), Math.floor(newHeight));
    camera.aspect = newHalfWidth / newHeight;
    camera.updateProjectionMatrix();
    composer.setSize(Math.floor(newHalfWidth), Math.floor(newHeight));
    
    // 오버레이 캔버스는 고정된 크기 유지 (resize 불필요)
});