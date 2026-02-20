import * as THREE from 'three';
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { RGBELoader } from "jsm/loaders/RGBELoader.js";
import { EffectComposer } from "jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "jsm/postprocessing/RenderPass.js";

// --- 1. 기본 설정 ---
let HALF_WIDTH = window.innerWidth / 2;
let FULL_HEIGHT = window.innerHeight;

// --- 2. 캔버스 설정 --- 
// 왼쪽 패널
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

// 오른쪽 패널
const rightPanel = document.getElementById('right-panel');
const rightCanvas = document.getElementById('right-canvas');
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

// ui 패널
const UI_CANVAS_SIZE = 256;
const uiCanvas = document.getElementById('ui-canvas');
uiCanvas.width = UI_CANVAS_SIZE;
uiCanvas.height = UI_CANVAS_SIZE;
const uiContext = uiCanvas.getContext('2d');
uiContext.fillStyle = '#000000';
uiContext.fillRect(0, 0, uiCanvas.width, uiCanvas.height);

// 3. 초기화 설정
// --- 캔버스 크기 설정 ---
const CANVAS_WIDTH = Math.floor(HALF_WIDTH);
const CANVAS_HEIGHT = Math.floor(FULL_HEIGHT);

// --- TouchDesigner 스타일의 Noise Shader ---
const NoiseShader = {
  uniforms: {
    uTime: { value: 0 },
    uScale: { value: 0.0 },      // 노이즈 크기 (Period)
    uDetail: { value: 4.0 },     // 노이즈 디테일 (Harmonics)
    uRoughness: { value: 0.3 },  // 거칠기 (Roughness)
    uContrast: { value: 2.0 },   // 대비 (Contrast)
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uScale;
    uniform float uDetail;
    uniform float uRoughness;
    uniform float uContrast;
    varying vec2 vUv;

    // --- Simplex Noise 3D (Ashima/WebGl-noise) ---
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * n_ * n_);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    float fbm(vec3 x) {
      float v = 0.0;
      float a = 0.5;
      vec3 shift = vec3(100.0);
      for (int i = 0; i < 5; ++i) {
        if(float(i) >= uDetail) break;
        v += a * snoise(x);
        x = x * 2.0 + shift;
        a *= uRoughness;
      }
      return v;
    }

    void main() {
      vec3 coord = vec3(vUv * uScale, uTime * 0.2); 
      float noiseValue = fbm(coord);

      noiseValue = noiseValue * 0.5 + 0.5;

      noiseValue = (noiseValue - 0.5) * uContrast + 0.5;
      
      noiseValue = clamp(noiseValue, 0.0, 1.0);

      gl_FragColor = vec4(vec3(noiseValue), 1.0);
    }
  `
};

const MultiplyShader = {
    uniforms: {
        tDiffuse1: { value: null }, // Noise
        tDiffuse2: { value: null }, // Drawing (HorseShoe)
        uBlurSize: { value: 0.003 } // 블러 강도 (0.001 ~ 0.01 추천)
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse1;
        uniform sampler2D tDiffuse2;
        uniform float uBlurSize;
        varying vec2 vUv;

        // 가우시안 가중치 계산 함수
        float getWeight(float x, float y) {
            float sigma = 2.0; // 블러의 퍼짐 정도 (표준편차)
            return exp(-(x*x + y*y) / (2.0 * sigma * sigma));
        }

        void main() {
            vec2 noiseUV = vec2(abs(vUv.x - 0.5) * 2.0, vUv.y);

            vec4 noise = texture2D(tDiffuse1, noiseUV);

            // --- Gaussian Blur Logic ---
            vec4 blurredColor = vec4(0.0);
            float totalWeight = 0.0;
            
            // -4 ~ +4 범위 (9x9 커널)
            // 반복 횟수가 많을수록 부드럽지만 성능 비용이 듭니다.
            // 너무 느리면 범위를 -2.0 ~ 2.0으로 줄이세요.
            const float radius = 4.0; 

            for(float x = -radius; x <= radius; x += 1.0) {
                for(float y = -radius; y <= radius; y += 1.0) {
                    // 1. 거리에 따른 오프셋
                    vec2 offset = vec2(x, y) * uBlurSize;
                    
                    // 2. 가중치 계산 (중심일수록 값이 크고, 멀수록 작아짐)
                    float weight = getWeight(x, y);

                    // 3. 색상 누적
                    blurredColor += texture2D(tDiffuse2, vUv + offset) * weight;
                    totalWeight += weight;
                }
            }

            // 가중치 합으로 나누어 평균화 (정규화)
            blurredColor /= totalWeight;

            // --- 합성 ---
            // 블러된 이미지의 Alpha값을 마스크로 사용
            float mask = blurredColor.a;
            
            // 검정 배경 이미지일 경우 아래 줄 사용:
            // float mask = blurredColor.r;

            // 마스크의 경계를 더 부드럽게 만들기 위해 smoothstep을 쓸 수도 있음 (선택사항)
            // mask = smoothstep(0.0, 1.0, mask);

            vec3 finalColor = noise.rgb * mask;

            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};

// Post-Processing Setup ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const ctrls = new OrbitControls(camera, renderer.domElement);
ctrls.enableDamping = true;

// --- 텍스처 관리 ---
let leftCanvasTexture = null;
let normalMapTexture = null;

// --- 데이터 로드 ---
const texLoader = new THREE.TextureLoader();
const path = './assets/textures/Snow001_4K-JPG/Snow001_4K-JPG_';

const snowNormalImage = new Image();
snowNormalImage.crossOrigin = "Anonymous";
snowNormalImage.src = `${path}NormalGL.jpg`;

const bgBaseMap = texLoader.load(`${path}Color.jpg`);
const bgNormalMap = texLoader.load(`${path}NormalGL.jpg`);
const bgRoughnessMap = texLoader.load(`${path}Roughness.jpg`);

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

const brushImage = new Image();
brushImage.src = './assets/textures/HorseShoe_fill.png'; // 업로드한 파일 경로
brushImage.crossOrigin = "Anonymous";


//4. 함수 설정
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

function createNormalMapTexture(source) {
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = CANVAS_WIDTH;
    normalCanvas.height = CANVAS_HEIGHT;
    const normalContext = normalCanvas.getContext('2d');
    
    // source가 RenderTarget인 경우와 Canvas인 경우 모두 처리
    let sourceCanvas = source;
    
    if (source instanceof THREE.WebGLRenderTarget) {
        // RenderTarget의 실제 크기 (combinedRenderTarget은 1024×1024)
        const rtWidth = 1024;
        const rtHeight = 1024;
        
        // 원본 크기로 픽셀 데이터 읽기
        const pixelBuffer = new Uint8Array(rtWidth * rtHeight * 4);
        rendererLeft.readRenderTargetPixels(source, 0, 0, rtWidth, rtHeight, pixelBuffer);
        
        // 픽셀 데이터 수직 뒤집기 (Y축 반전)
        const flippedBuffer = new Uint8Array(rtWidth * rtHeight * 4);
        for (let y = 0; y < rtHeight; y++) {
            for (let x = 0; x < rtWidth; x++) {
                const srcIdx = (y * rtWidth + x) * 4;
                const dstIdx = ((rtHeight - 1 - y) * rtWidth + x) * 4;
                flippedBuffer[dstIdx] = pixelBuffer[srcIdx];
                flippedBuffer[dstIdx + 1] = pixelBuffer[srcIdx + 1];
                flippedBuffer[dstIdx + 2] = pixelBuffer[srcIdx + 2];
                flippedBuffer[dstIdx + 3] = pixelBuffer[srcIdx + 3];
            }
        }
        
        // 임시 canvas에 데이터 넣기 (1024×1024)
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = rtWidth;
        tempCanvas.height = rtHeight;
        const tempCtx = tempCanvas.getContext('2d');
        const imageData = tempCtx.createImageData(rtWidth, rtHeight);
        imageData.data.set(flippedBuffer);
        tempCtx.putImageData(imageData, 0, 0);
        
        sourceCanvas = tempCanvas;
    }
    
    // heightToNormal 처리
    const tempNormalCanvas = document.createElement('canvas');
    tempNormalCanvas.width = sourceCanvas.width;
    tempNormalCanvas.height = sourceCanvas.height;
    const tempNormalContext = tempNormalCanvas.getContext('2d');
    heightToNormal(sourceCanvas, tempNormalContext, 4.0);
    
    // 최종 크기로 리사이징하여 normalCanvas에 그리기
    normalContext.drawImage(tempNormalCanvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (snowNormalImage.complete && snowNormalImage.naturalWidth > 0) {
        normalContext.globalCompositeOperation = 'overlay';
        normalContext.drawImage(snowNormalImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        normalContext.globalCompositeOperation = 'source-over';
    }
    
    return normalCanvas;
}

function createLeftTexture() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempContext = tempCanvas.getContext('2d');
    tempContext.fillStyle = '#000000';
    tempContext.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return tempCanvas;
}

// 5. scene Loader

// --- Noise 렌더 타겟 설정 ---
const noiseRenderTarget = new THREE.WebGLRenderTarget(1024, 1024, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
});

const noiseScene = new THREE.Scene();
const noiseCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const noiseMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(NoiseShader.uniforms),
    vertexShader: NoiseShader.vertexShader,
    fragmentShader: NoiseShader.fragmentShader,
    side: THREE.DoubleSide
});

const noiseGeometry = new THREE.PlaneGeometry(2, 2);
const noiseMesh = new THREE.Mesh(noiseGeometry, noiseMaterial);
noiseScene.add(noiseMesh);

// --- 합성용 렌더 타겟 설정 ---
const combinedRenderTarget = new THREE.WebGLRenderTarget(1024, 1024);
const combineScene = new THREE.Scene();
const combineCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const horseshoeTexture = new THREE.TextureLoader().load(
  './assets/textures/HorseShoe_fill.png',
  function (texture) {
    console.log('Horseshoe texture loaded:', texture);
  },
  undefined,
  function (error) {
    console.error('Failed to load horseshoe texture:', error);
  }
);

const combineMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(MultiplyShader.uniforms),
    vertexShader: MultiplyShader.vertexShader,
    fragmentShader: MultiplyShader.fragmentShader
});

combineMaterial.uniforms.uBlurSize.value = 0.05; 

const combineMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), combineMaterial);
combineScene.add(combineMesh);

// --- leftMaterial 수정: combinedRenderTarget.texture 사용 ---
const leftMaterial = new THREE.MeshBasicMaterial({
    map: combinedRenderTarget.texture,
    side: THREE.FrontSide,
});

const leftGeometry = new THREE.PlaneGeometry(HALF_WIDTH, FULL_HEIGHT);
const leftMesh = new THREE.Mesh(leftGeometry, leftMaterial);
leftMesh.position.set(0, 0, 0);
sceneLeft.add(leftMesh);

// --- 텍스처 및 변수 초기화 ---
let leftTexture = createLeftTexture();
leftCanvasTexture = new THREE.CanvasTexture(leftTexture);

let normalMapCanvas = createNormalMapTexture(leftTexture);
normalMapTexture = new THREE.CanvasTexture(normalMapCanvas);
normalMapTexture.magFilter = THREE.LinearFilter;
normalMapTexture.minFilter = THREE.LinearFilter;
normalMapTexture.anisotropy = renderer.capabilities.maxAnisotropy;


// right panel scene
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

// 6. drawing loop

// --- Drawing Configuration ---
const LINE_RADIUS = 3;
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

    // --- 노이즈 파라미터 조절 (마우스 움직임 기반) ---
    // 1. 움직임 속도 → uScale (빠르면 증가, 느리면 감소)
    const speedFactor = distance * 0.02 - 0.02; // distance가 크면 양수(증가), 작으면 음수(감소)
    noiseMaterial.uniforms.uScale.value += speedFactor;
    noiseMaterial.uniforms.uScale.value = Math.max(0.1, Math.min(5.0, noiseMaterial.uniforms.uScale.value));

    // 2. 오른쪽(dx > 0) → uDetail 증가, 왼쪽(dx < 0) → 감소
    if (Math.abs(dx) > 1) {
        noiseMaterial.uniforms.uDetail.value += dx * 0.01;
        noiseMaterial.uniforms.uDetail.value = Math.max(1.0, Math.min(5.0, noiseMaterial.uniforms.uDetail.value));
    }

    // 3. 위아래 움직임 → uContrast 변경
    if (Math.abs(dy) > 1) {
        noiseMaterial.uniforms.uContrast.value += dy * 0.01;
        noiseMaterial.uniforms.uContrast.value = Math.max(0.5, Math.min(2.0, noiseMaterial.uniforms.uContrast.value));
    }

    // 4. 마우스 움직임 → uBlurSize 감소 (0.005가 최소값)
    combineMaterial.uniforms.uBlurSize.value -= distance * 0.0001  ;
    combineMaterial.uniforms.uBlurSize.value = Math.max(0.005, combineMaterial.uniforms.uBlurSize.value);

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
    
    // // 왼쪽 패널 업데이트
    // leftTexture = createLeftTexture();
    // leftCanvasTexture.image = leftTexture;
    // leftCanvasTexture.needsUpdate = true;
});

// --- Apply Normal Map 버튼 ---
function applyDrawingNormalMap() {
    normalMapCanvas = createNormalMapTexture(combinedRenderTarget);
    console.log(normalMapTexture.image);
    console.log(normalMapCanvas);
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
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();

    // 1. 노이즈 생성 (가상 메모리에 그림)
    // isDrawing일 때만 uTime 증가
    if (isDrawing) {
        noiseMaterial.uniforms.uTime.value += deltaTime;
    }
    rendererLeft.setRenderTarget(noiseRenderTarget);
    rendererLeft.render(noiseScene, noiseCamera);
    rendererLeft.setRenderTarget(null);

    // 2. 합성 (노이즈 * 편자 이미지)
    combineMaterial.uniforms.tDiffuse1.value = noiseRenderTarget.texture;
    combineMaterial.uniforms.tDiffuse2.value = horseshoeTexture;

    rendererLeft.setRenderTarget(combinedRenderTarget);
    rendererLeft.render(combineScene, combineCamera);
    rendererLeft.setRenderTarget(null);

    // 3. leftMaterial에 합성 결과 텍스처 적용
    leftMaterial.map = combinedRenderTarget.texture;
    leftMaterial.needsUpdate = true;

    // 4. 최종 결과 좌측 패널에 그리기
    rendererLeft.render(sceneLeft, cameraLeft);
    
    // 5. UI 캔버스에 파라미터 값 표시 (그려진 선은 유지)
    // 파라미터 텍스트 배경만 그리기
    uiContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
    uiContext.fillRect(0, 0, 150, 90);
    
    uiContext.fillStyle = '#00ff00';
    uiContext.font = 'bold 12px Courier New';
    uiContext.textAlign = 'left';
    
    const scale = noiseMaterial.uniforms.uScale.value.toFixed(2);
    const detail = noiseMaterial.uniforms.uDetail.value.toFixed(2);
    const roughness = noiseMaterial.uniforms.uRoughness.value.toFixed(2);
    const contrast = noiseMaterial.uniforms.uContrast.value.toFixed(2);
    const blurSize = combineMaterial.uniforms.uBlurSize.value.toFixed(5);
    
    uiContext.fillText(`Scale: ${scale}`, 10, 20);
    uiContext.fillText(`Detail: ${detail}`, 10, 35);
    uiContext.fillText(`Roughness: ${roughness}`, 10, 50);
    uiContext.fillText(`Contrast: ${contrast}`, 10, 65);
    uiContext.fillText(`BlurSize: ${blurSize}`, 10, 80);
    
    // ctrls.update();
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
