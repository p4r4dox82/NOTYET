import * as THREE from "three";
import { OrbitControls } from "jsm/controls/OrbitControls.js";
import { RGBELoader } from "jsm/loaders/RGBELoader.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "jsm/postprocessing/ShaderPass.js";

// --- 0. 레이아웃 및 전역 설정 ---
const HALF_WIDTH = window.innerWidth / 2;
const FULL_HEIGHT = window.innerHeight;
const SIMULATION_SIZE = 1024; // 내부 계산용 고해상도 크기

// --- 캔버스 크기 설정 ---
const CANVAS_WIDTH = Math.floor(HALF_WIDTH);
const CANVAS_HEIGHT = Math.floor(FULL_HEIGHT);

// [핵심] 실제 그림이 그려지는 캔버스 (화면엔 안 보이고 메모리에만 존재)
const drawingCanvas = document.createElement('canvas');
drawingCanvas.width = SIMULATION_SIZE;
drawingCanvas.height = SIMULATION_SIZE;
const drawingContext = drawingCanvas.getContext('2d');

// --- 1. 왼쪽 패널 (Three.js 2D 뷰어) ---
const leftCanvas = document.getElementById('left-canvas');
// Three.js 렌더러 크기 설정
const rendererLeft = new THREE.WebGLRenderer({ antialias: true, canvas: leftCanvas });
rendererLeft.setSize(Math.floor(HALF_WIDTH), Math.floor(FULL_HEIGHT));
rendererLeft.toneMapping = THREE.ACESFilmicToneMapping;
rendererLeft.toneMappingExposure = 1.0;

const sceneLeft = new THREE.Scene();
sceneLeft.background = new THREE.Color(0x1a1a1a);

const cameraLeft = new THREE.OrthographicCamera(
    -HALF_WIDTH / 2, HALF_WIDTH / 2,
    FULL_HEIGHT / 2, -FULL_HEIGHT / 2,
    0.1, 1000
);
cameraLeft.position.z = 10;

// --- 2. 오른쪽 패널 (3D 눈밭) ---
const rightPanel = document.getElementById('right-panel');
const rightCanvas = document.createElement('canvas');
rightPanel.appendChild(rightCanvas);

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: rightCanvas });
renderer.setSize(Math.floor(HALF_WIDTH), Math.floor(FULL_HEIGHT));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(75, HALF_WIDTH / FULL_HEIGHT, 0.1, 1000);
camera.position.set(0, 0, 7);

// --- 3. UI 캔버스 (입력 전용) ---
// 실제 화면 위에 투명하게 떠서 마우스 이벤트만 잡는 역할
const uiCanvas = document.getElementById('ui-canvas');
// 크기는 CSS 스타일이나 레이아웃에 맞춰야 하지만, 여기선 좌표 계산용으로 씁니다.
uiCanvas.width = Math.floor(HALF_WIDTH); 
uiCanvas.height = Math.floor(FULL_HEIGHT);
// UI 캔버스는 아무것도 그리지 않으므로 context 작업 불필요

// --- 4. 자산 및 텍스처 로드 ---
const path = "./assets/textures/Snow001_4K-JPG/Snow001_4K-JPG_";

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
rgbeLoader.load("./assets/textures/0_hdri/snowy_cemetery_4k.hdr", (texture) => {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  scene.background = envMap;
  scene.environment = envMap;
  pmremGenerator.dispose();
});

// --- 5. 편자 이미지 로드 및 초기화 (drawingCanvas에 그리기) ---
const brushImage = new Image();
brushImage.crossOrigin = "Anonymous";
brushImage.src = './assets/HorseShoe_fill.png';

function initDrawingCanvas() {
    // 배경 검정으로 초기화
    drawingContext.fillStyle = '#000000';
    drawingContext.fillRect(0, 0, SIMULATION_SIZE, SIMULATION_SIZE);

    if (brushImage.complete) {
        const margin = 100; // 여백
        const imgAspect = brushImage.width / brushImage.height;
        // 정사각형 캔버스 기준 비율 계산
        let drawW, drawH;
        if (imgAspect > 1) { // 가로가 더 긴 경우
            drawW = SIMULATION_SIZE - margin * 2;
            drawH = drawW / imgAspect;
        } else { // 세로가 더 긴 경우
            drawH = SIMULATION_SIZE - margin * 2;
            drawW = drawH * imgAspect;
        }

        const offsetX = (SIMULATION_SIZE - drawW) / 2;
        const offsetY = (SIMULATION_SIZE - drawH) / 2;

        drawingContext.drawImage(brushImage, offsetX, offsetY, drawW, drawH);
        
        // 텍스처 업데이트 알림
        if (leftCanvasTexture) leftCanvasTexture.needsUpdate = true;
        if (displacementTexture) displacementTexture.needsUpdate = true;
    }
}

brushImage.onload = () => {
    initDrawingCanvas();
};

// --- 6. 텍스처 & 재질 연결 ---

// [중요] drawingCanvas를 텍스처로 사용
let leftCanvasTexture = new THREE.CanvasTexture(drawingCanvas);
let displacementTexture = leftCanvasTexture; // 오른쪽 눈밭 높이맵도 이걸 공유

// Normal Map 생성 함수
function heightToNormal(srcCanvas, dstContext, intensity) {
  const width = srcCanvas.width;
  const height = srcCanvas.height;
  const srcCtx = srcCanvas.getContext("2d");
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
      dstPixels[idx] = (dX / len + 1) * 127.5; // R
      dstPixels[idx + 1] = (dY / len + 1) * 127.5; // G
      dstPixels[idx + 2] = (dZ / len + 1) * 127.5; // B (Normal Z)
      dstPixels[idx + 3] = 255; // Alpha
    }
  }
  dstContext.putImageData(dstData, 0, 0);
}


function createNormalMapTexture(sourceCanvas) {
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = CANVAS_WIDTH;
  normalCanvas.height = CANVAS_HEIGHT;
  const normalContext = normalCanvas.getContext("2d");
  heightToNormal(sourceCanvas, normalContext, 10.0);

  if (snowNormalImage.complete && snowNormalImage.naturalWidth > 0) {
    normalContext.globalCompositeOperation = "overlay";
    normalContext.drawImage(snowNormalImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    normalContext.globalCompositeOperation = "source-over";
  }
  return normalCanvas;
}

// 초기 Normal Map 생성
let normalMapCanvas = createNormalMapTexture(drawingCanvas);
let normalMapTexture = new THREE.CanvasTexture(normalMapCanvas);
normalMapTexture.magFilter = THREE.LinearFilter;
normalMapTexture.minFilter = THREE.LinearFilter;
normalMapTexture.anisotropy = renderer.capabilities.maxAnisotropy;

// 왼쪽 패널 Mesh
const leftMaterial = new THREE.MeshBasicMaterial({
    map: leftCanvasTexture,
    side: THREE.FrontSide,
});
// 꽉 찬 화면을 위해 Plane 크기 조정
const leftGeometry = new THREE.PlaneGeometry(HALF_WIDTH, FULL_HEIGHT);
const leftMesh = new THREE.Mesh(leftGeometry, leftMaterial);
sceneLeft.add(leftMesh);

// --- 오른쪽 재질 (displacement + normal) ---
const materialRight = new THREE.MeshPhysicalMaterial({
  map: bgBaseMap,
  normalMap: normalMapTexture,
  normalScale: new THREE.Vector2(0.8, 0.8),
  roughnessMap: bgRoughnessMap,
//   displacementMap: displacementTexture,
//   displacementScale: 0.22,
//   displacementBias: 0,
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

// --- Lights ---
const mainLight = new THREE.PointLight(0xffffff, 0.4, 100);
mainLight.position.set(10, 3, 5);
mainLight.castShadow = true;
scene.add(mainLight);


// --- Drawing Logic (핵심 수정) ---

let isDrawing = false;
let lastX = 0;
let lastY = 0;

// uiCanvas는 "마우스 좌표 수집"용으로만 사용
uiCanvas.addEventListener('mousedown', (event) => {
    const rect = uiCanvas.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) return;

    isDrawing = true;

    // 좌표 매핑: UI 좌표 -> DrawingCanvas(1024x1024) 좌표
    const scaleX = SIMULATION_SIZE / rect.width;
    const scaleY = SIMULATION_SIZE / rect.height;

    lastX = (event.clientX - rect.left) * scaleX;
    lastY = (event.clientY - rect.top) * scaleY;
});

uiCanvas.addEventListener('mouseup', () => {
    isDrawing = false;
    // 마우스 뗄 때 Normal Map 업데이트 등을 원하면 여기서 호출
});

uiCanvas.addEventListener('mousemove', (event) => {
    if (!isDrawing) return;

    const rect = uiCanvas.getBoundingClientRect();
    
    // 1. 좌표 매핑 (화면 좌표 -> 1024 해상도 좌표)
    const scaleX = SIMULATION_SIZE / rect.width;
    const scaleY = SIMULATION_SIZE / rect.height;

    const currentX = (event.clientX - rect.left) * scaleX;
    const currentY = (event.clientY - rect.top) * scaleY;

    // 2. 속도 계산
    const dx = currentX - lastX;
    const dy = currentY - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.min(distance, 100); // 속도 제한 (조절 가능)

    // 3. [그리기 로직] -> drawingContext에 적용
    
    // (A) 브러시 설정
    // 속도가 빠를수록 브러시가 커지고, 왜곡이 심해짐
    const brushSize = 40 + speed * 0.5; 
    const distortion = speed * 0.3; // 픽셀 밀림 강도
    const rotationNoise = (Math.random() - 0.5) * (speed * 0.02);

    drawingContext.save();

    // 변형의 중심점 이동
    drawingContext.translate(currentX, currentY);
    drawingContext.rotate(rotationNoise);

    // 블렌딩 모드: 'source-over'로 덮어쓰기 (Smudge 효과)
    drawingContext.globalCompositeOperation = 'source-over';
    drawingContext.globalAlpha = 0.9; // 기존 그림과 살짝 섞임

    // Jitter (떨림) 계산
    const jitterX = (Math.random() - 0.5) * distortion;
    const jitterY = (Math.random() - 0.5) * distortion;

    // (B) 픽셀 유동화 (Liquify) 효과 구현
    // drawingCanvas(자기 자신)의 주변 영역을 복사해서 -> 약간 빗나간 위치에 다시 그림
    drawingContext.drawImage(
        drawingCanvas,           // 소스: 자기 자신
        currentX - brushSize/2,  // 가져올 위치 X
        currentY - brushSize/2,  // 가져올 위치 Y
        brushSize,               // 크기
        brushSize,
        
        -brushSize/2 + jitterX,  // 붙일 위치 X (translate 기준)
        -brushSize/2 + jitterY,  // 붙일 위치 Y
        brushSize + jitterX,     // 약간 늘어나거나 줄어들며 붙임
        brushSize + jitterY
    );

    drawingContext.restore();

    // 4. 상태 업데이트
    lastX = currentX;
    lastY = currentY;

    // 왼쪽 패널 업데이트
    leftTexture = createLeftTexture();
    leftCanvasTexture.image = leftTexture;
    leftCanvasTexture.needsUpdate = true;
});

// --- Apply Normal Map 버튼 ---
function applyDrawingNormalMap() {
    normalMapCanvas = createNormalMapTexture(drawingCanvas);
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

// --- Composer & Render Loop ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const ctrls = new OrbitControls(camera, renderer.domElement);
// --- 렌더링 루프 ---
function animate() {
  requestAnimationFrame(animate);
  rendererLeft.render(sceneLeft, cameraLeft);
  ctrls.update();
  composer.render();
}
animate();
// --- 리사이징 ---
window.addEventListener("resize", () => {
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
