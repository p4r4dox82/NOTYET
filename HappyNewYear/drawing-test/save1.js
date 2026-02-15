import * as THREE from 'three';
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { RGBELoader } from "jsm/loaders/RGBELoader.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "jsm/postprocessing/ShaderPass.js";

// 전역 변수 선언
const brushImage = new Image();
brushImage.src = './assets/HorseShoe_fill.png'; // 업로드한 파일 경로
brushImage.crossOrigin = "Anonymous";

// --- 0. 레이아웃 설정 ---
let HALF_WIDTH = window.innerWidth / 2;
let FULL_HEIGHT = window.innerHeight;

// --- 1. 왼쪽 패널 (평면 이미지) ---
const leftPanel = document.getElementById('left-panel');
const leftCanvas = document.getElementById('left-canvas');
leftCanvas.width = Math.floor(HALF_WIDTH);
leftCanvas.height = Math.floor(FULL_HEIGHT);
leftPanel.appendChild(leftCanvas);

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

// --- 2. 오른쪽 패널 (3D) ---
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

// --- 3. 오버레이 그리기 캔버스 (UI용) ---
const UI_CANVAS_SIZE = 256;
const uiCanvas = document.getElementById('ui-canvas');
uiCanvas.width = UI_CANVAS_SIZE;
uiCanvas.height = UI_CANVAS_SIZE;
const uiContext = uiCanvas.getContext('2d');
uiContext.fillStyle = '#000000';
uiContext.fillRect(0, 0, uiCanvas.width, uiCanvas.height);





// --- Post-Processing Setup ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const ctrls = new OrbitControls(camera, renderer.domElement);
ctrls.enableDamping = true;
// --- 캔버스 크기 설정 ---
const CANVAS_WIDTH = Math.floor(HALF_WIDTH);
const CANVAS_HEIGHT = Math.floor(FULL_HEIGHT);

// --- 텍스처 관리 ---
let leftCanvasTexture = null;
let normalMapTexture = null;

// --- 자산 로드 ---
const texLoader = new THREE.TextureLoader();
const path = './assets/textures/Snow001_4K-JPG/Snow001_4K-JPG_';


const snowNormalImage = new Image();
snowNormalImage.crossOrigin = "Anonymous";
snowNormalImage.src = `${path}NormalGL.jpg`;

const bgLoader = new THREE.TextureLoader();
const bgBaseMap = bgLoader.load(`${path}Color.jpg`);
const bgNormalMap = bgLoader.load(`${path}NormalGL.jpg`);
const bgRoughnessMap = bgLoader.load(`${path}Roughness.jpg`);

[bgBaseMap, bgNormalMap, bgRoughnessMap].forEach(tex => {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
});

const rgbeLoader = new RGBELoader();
rgbeLoader.load('./assets/textures/0_hdri/snowy_cemetery_4k.hdr', (texture) => {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.background = envMap;
    scene.environment = envMap;
    pmremGenerator.dispose();
});

// --- Utility 함수 ---
// --- 7. Utility (수정됨: 부드러운 Normal Map 생성) ---
function heightToNormal(srcCanvas, dstContext, intensity) {
  const width = srcCanvas.width;
  const height = srcCanvas.height;
  
  const srcCtx = srcCanvas.getContext('2d');
  const srcData = srcCtx.getImageData(0, 0, width, height);
  const dstData = dstContext.createImageData(width, height);
  
  const srcPixels = srcData.data;
  const dstPixels = dstData.data;

  // [핵심 변경] offset: 픽셀을 건너뛰며 샘플링합니다.
  // 값이 클수록(예: 2~4) 자잘한 노이즈가 사라지고 굴곡이 매우 부드러워집니다.
  const offset = 2; 

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // 경계 검사: 이미지 밖으로 나가지 않도록 clamp 처리
      const xLeft = Math.max(0, x - offset);
      const xRight = Math.min(width - 1, x + offset);
      const yUp = Math.max(0, y - offset);
      const yDown = Math.min(height - 1, y + offset);

      // 주변 픽셀의 높이(Red 채널) 가져오기
      // (R, G, B가 같으므로 R만 써도 무방)
      const hL = srcPixels[(y * width + xLeft) * 4];
      const hR = srcPixels[(y * width + xRight) * 4];
      const hU = srcPixels[(yUp * width + x) * 4];
      const hD = srcPixels[(yDown * width + x) * 4];

      // [핵심 변경] Sobel 필터와 유사한 방식
      // 좌우 차이(dX), 상하 차이(dY) 계산
      const dX = (hL - hR) * intensity;
      const dY = (hU - hD) * intensity;

      // Z축(하늘 방향) 설정
      // 이 값이 클수록 표면이 평평해 보이고, 작을수록 굴곡이 심해 보입니다.
      // 255.0 / intensity 형태로 정규화하면 부드러운 결과를 얻기 쉽습니다.
      const dZ = 255.0 / (intensity * 0.5); 

      // 벡터 정규화 (길이를 1로 만듦)
      const len = Math.sqrt(dX * dX + dY * dY + dZ * dZ);

      // -1 ~ 1 범위의 벡터를 0 ~ 255 색상값으로 변환
      dstPixels[idx] = ((dX / len) + 1) * 127.5;     // R
      dstPixels[idx + 1] = ((dY / len) + 1) * 127.5; // G
      dstPixels[idx + 2] = ((dZ / len) + 1) * 127.5; // B (Normal Z)
      dstPixels[idx + 3] = 255;                      // Alpha
    }
  }

  dstContext.putImageData(dstData, 0, 0);
}


// --- 초기 텍스처 생성 ---
function createLeftTexture() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempContext = tempCanvas.getContext('2d');
    
    tempContext.fillStyle = '#000000';
    tempContext.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 파이 모양 미리 그리기
    tempContext.fillStyle = '#000000';
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;
    const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.35;
    
    // 호 그리기 (파이 모양)
    tempContext.beginPath();
    tempContext.arc(centerX, centerY, radius, 0, Math.PI * 1.5);
    tempContext.lineTo(centerX, centerY);
    tempContext.closePath();
    tempContext.fill();
    
    tempContext.drawImage(uiCanvas, 0, 0, UI_CANVAS_SIZE, UI_CANVAS_SIZE, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    return tempCanvas;
}

function createNormalMapTexture(sourceCanvas) {
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = CANVAS_WIDTH;
    normalCanvas.height = CANVAS_HEIGHT;
    const normalContext = normalCanvas.getContext('2d');
    
    heightToNormal(sourceCanvas, normalContext, 6.0);
    
    // if (bgNormalMap.image) {
    //     normalContext.globalCompositeOperation = 'overlay';
    //     normalContext.drawImage(bgNormalMap.image, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    //     normalContext.globalCompositeOperation = 'source-over';
    // }
    
    if (snowNormalImage.complete && snowNormalImage.naturalWidth > 0) {
        normalContext.globalCompositeOperation = 'overlay';
        normalContext.drawImage(snowNormalImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        normalContext.globalCompositeOperation = 'source-over';
    }
    
    return normalCanvas;
}

// --- 재질 설정 ---
let leftTexture = createLeftTexture();
leftCanvasTexture = new THREE.CanvasTexture(leftTexture);

let normalMapCanvas = createNormalMapTexture(leftTexture);
normalMapTexture = new THREE.CanvasTexture(normalMapCanvas);
normalMapTexture.magFilter = THREE.LinearFilter;
normalMapTexture.minFilter = THREE.LinearFilter;
normalMapTexture.anisotropy = renderer.capabilities.maxAnisotropy;

const leftMaterial = new THREE.MeshBasicMaterial({
    map: leftCanvasTexture,
    side: THREE.FrontSide,
});

const leftGeometry = new THREE.PlaneGeometry(HALF_WIDTH, FULL_HEIGHT);
const leftMesh = new THREE.Mesh(leftGeometry, leftMaterial);
leftMesh.position.set(0, 0, 0);
sceneLeft.add(leftMesh);

// --- 오른쪽 재질 (displacement + normal) ---
const displacementTexture = new THREE.CanvasTexture(leftTexture);
const materialRight = new THREE.MeshPhysicalMaterial({
    map: bgBaseMap,
    normalMap: normalMapTexture,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughnessMap: bgRoughnessMap,
    
    displacementMap: displacementTexture,
    displacementScale: 0.22,
    displacementBias: 0,
    
    roughness: 0.7,
    metalness: 0.1,
    
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    
    opacity: 1,
    transparent: true,
});

const geometry = new THREE.PlaneGeometry(10, 10, 256, 256);
const mesh = new THREE.Mesh(geometry, materialRight);
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);

const mainLight = new THREE.PointLight(0xffffff, 0.4, 100);
mainLight.position.set(10, 3, 5);
mainLight.castShadow = true;
mainLight.shadow.bias = -0.0001;
scene.add(mainLight);

// --- Drawing Configuration ---
const LINE_RADIUS = 4;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

// --- Drawing 이벤트 ---
uiCanvas.addEventListener('mousedown', (event) => {
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

    const rect = uiCanvas.getBoundingClientRect();
    
    // [중요] 캔버스 해상도(width/height)와 CSS 크기가 다를 수 있으므로 비율 계산
    const scaleX = uiCanvas.width / rect.width;
    const scaleY = uiCanvas.height / rect.height;

    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) {
        return;
    }

    // 좌표 보정
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const dx = x - lastX;
    const dy = y - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // [설정] 보간 간격을 조금 더 촘촘하게 (0.5 -> 0.25)
    // 그라데이션이 겹쳐지면서 그려지므로 간격이 좁을수록 더 부드럽습니다.
    const steps = Math.ceil(distance / (LINE_RADIUS * 0.25));

    uiContext.shadowBlur = 0;

    // [핵심] 보간 루프 안에서 그라데이션 적용
    for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const interpX = lastX + dx * t;
        const interpY = lastY + dy * t;

        // --- 부드러운 눈 브러시 (Gradient) ---
        // 매 좌표마다 중심이 다른 그라데이션을 생성합니다.
        const grad = uiContext.createRadialGradient(
            interpX, interpY, 0, 
            interpX, interpY, LINE_RADIUS
        );

        // 투명도(Alpha) 조절이 핵심입니다.
        // 원들이 수십 개 겹쳐지며 그려지기 때문에 투명도를 낮게(0.1~0.2) 잡아야 
        // 뭉치지 않고 자연스럽게 깊어집니다.
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');   // 중심 (가장 깊음)
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)'); // 중간 (서서히 얕아짐)
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');     // 끝 (바닥)

        uiContext.fillStyle = grad;
        uiContext.beginPath();
        uiContext.arc(interpX, interpY, LINE_RADIUS, 0, Math.PI * 2);
        uiContext.fill();
    }

    lastX = x;
    lastY = y;
    
    // 왼쪽 패널 업데이트
    leftTexture = createLeftTexture();
    leftCanvasTexture.image = leftTexture;
    leftCanvasTexture.needsUpdate = true;
});

// --- Apply Normal Map 버튼 ---
function applyDrawingNormalMap() {
    normalMapCanvas = createNormalMapTexture(leftTexture);
    normalMapTexture.image = normalMapCanvas;
    normalMapTexture.magFilter = THREE.LinearFilter;
    normalMapTexture.minFilter = THREE.LinearFilter;
    normalMapTexture.anisotropy = renderer.capabilities.maxAnisotropy;
    normalMapTexture.needsUpdate = true;
    console.log('Normal map applied!');
}

const applyButton = document.getElementById('apply-button');
if (applyButton) {
    applyButton.addEventListener('click', applyDrawingNormalMap);
}

// --- 렌더링 루프 ---
function animate() {
    requestAnimationFrame(animate);
    
    rendererLeft.render(sceneLeft, cameraLeft);
    
    ctrls.update();
    composer.render();
}
animate();

// --- 리사이징 ---
window.addEventListener('resize', () => {
    const newHalfWidth = window.innerWidth / 2;
    const newHeight = window.innerHeight;
    
    rendererLeft.setSize(Math.floor(newHalfWidth), Math.floor(newHeight));
    cameraLeft.left = -newHalfWidth / 2;
    cameraLeft.right = newHalfWidth / 2;
    cameraLeft.top = newHeight / 2;
    cameraLeft.bottom = -newHeight / 2;
    cameraLeft.updateProjectionMatrix();
    
    renderer.setSize(Math.floor(newHalfWidth), Math.floor(newHeight));
    camera.aspect = newHalfWidth / newHeight;
    camera.updateProjectionMatrix();
    composer.setSize(Math.floor(newHalfWidth), Math.floor(newHeight));
});
