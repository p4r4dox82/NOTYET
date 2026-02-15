// --- TouchDesigner 스타일의 Noise Shader ---
import * as THREE from 'three';

// --- Scene 기본 설정 ---
const canvas = document.querySelector('canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const NoiseShader = {
  uniforms: {
    uTime: { value: 0 },
    uScale: { value: 3.0 },      // 노이즈 크기 (Period)
    uDetail: { value: 4.0 },     // 노이즈 디테일 (Harmonics)
    uRoughness: { value: 0.5 },  // 거칠기 (Roughness)
    uContrast: { value: 1.2 },   // 대비 (Contrast)
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
    // TouchDesigner와 유사한 느낌을 내는 핵심 알고리즘
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

      // First corner
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;

      // Other corners
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
      vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

      // Permutations
      i = mod289(i);
      vec4 p = permute( permute( permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

      // Gradients: 7x7 points over a square, mapped onto an octahedron.
      // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
      float n_ = 0.142857142857; // 1.0/7.0
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * n_ * n_);  // mod(p,7*7)

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

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

      //Normalise gradients
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      // Mix final noise value
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    // --- FBM (Fractal Brownian Motion) ---
    // 노이즈를 여러 겹 쌓아서 디테일을 만드는 함수 (TouchDesigner의 Harmonics)
    float fbm(vec3 x) {
      float v = 0.0;
      float a = 0.5;
      vec3 shift = vec3(100.0);
      for (int i = 0; i < 5; ++i) { // 5 Octaves
        if(float(i) >= uDetail) break;
        v += a * snoise(x);
        x = x * 2.0 + shift;
        a *= uRoughness;
      }
      return v;
    }

    void main() {
      // 1. 기본 노이즈 생성 (시간에 따라 변화)
      vec3 coord = vec3(vUv * uScale, uTime * 0.2); 
      float noiseValue = fbm(coord);

      // 2. 값 범위 보정 (-1~1 -> 0~1)
      noiseValue = noiseValue * 0.5 + 0.5;

      // 3. 대비(Contrast) 조절 - TouchDesigner 스타일
      noiseValue = (noiseValue - 0.5) * uContrast + 0.5;
      
      // 4. Clamp (0~1 사이로 자르기)
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




// 1. 재질 생성
const noiseMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(NoiseShader.uniforms),
    vertexShader: NoiseShader.vertexShader,
    fragmentShader: NoiseShader.fragmentShader,
    side: THREE.DoubleSide
});

// 2. 파라미터 조절 (원하는 느낌으로 튜닝)
noiseMaterial.uniforms.uScale.value = 3.0;      // 숫자가 클수록 패턴이 작아짐
noiseMaterial.uniforms.uDetail.value = 4.0;     // 디테일 단계
noiseMaterial.uniforms.uContrast.value = 1.5;   // 대비를 높여서 흑백을 뚜렷하게
noiseMaterial.uniforms.uRoughness.value = 0.5;  // 거친 정도

// 3. 메쉬에 적용 (예: 왼쪽 패널에 적용)
// const geometry = new THREE.PlaneGeometry(10, 10);

// --- 1. 노이즈를 그릴 가상 캔버스 (Render Target) 생성 ---
// TouchDesigner의 'Noise TOP'과 같은 역할입니다.
const noiseRenderTarget = new THREE.WebGLRenderTarget(1024, 1024, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
});

// --- 2. 노이즈 전용 씬 & 카메라 설정 ---
const noiseScene = new THREE.Scene();

// 화면 전체(-1 ~ 1)를 꽉 채우는 카메라
const noiseCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

// 화면 꽉 차는 평면 생성
const noiseGeometry = new THREE.PlaneGeometry(2, 2); // 2x2 크기면 Orthographic 화면 꽉 참

// 앞서 만든 ShaderMaterial 적용
const noiseMesh = new THREE.Mesh(noiseGeometry, noiseMaterial);
noiseScene.add(noiseMesh);

// --- [준비] 1. 편자 이미지 텍스처 로드 ---
const horseshoeTexture = new THREE.TextureLoader().load(
  './assets/textures/HorseShoe_fill.png'
);

// --- [준비] 2. 합성용 렌더 타겟 생성 ---
const combinedRenderTarget = new THREE.WebGLRenderTarget(1024, 1024);

// --- [준비] 3. 합성용 씬 & 재질 생성 ---
const combineScene = new THREE.Scene();
const combineCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const combineMaterial = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(MultiplyShader.uniforms),
    vertexShader: MultiplyShader.vertexShader,
    fragmentShader: MultiplyShader.fragmentShader
});

combineMaterial.uniforms.uBlurSize.value = 0.005; 


const combineMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), combineMaterial);
combineScene.add(combineMesh);

// [수정] 3. 메쉬에 적용
// combinedRenderTarget의 결과(텍스처)를 보여줄 재질을 만듭니다.
const displayMaterial = new THREE.MeshBasicMaterial({
    map: combinedRenderTarget.texture, // 여기가 핵심! 계산된 결과를 맵으로 씀
    side: THREE.DoubleSide
});

const displayGeometry = new THREE.PlaneGeometry(5, 5); // 크기 적당히
const displayMesh = new THREE.Mesh(displayGeometry, displayMaterial);
scene.add(displayMesh); // 메인 씬에 추가

// 4. 애니메이션 루프에 추가 (중요: 시간 업데이트)
const clock = new THREE.Clock();

// 5. 슬라이더 컨트롤 설정
function setupSliderControls() {
    // Scale 슬라이더
    const scaleSlider = document.getElementById('scale-slider');
    const scaleValue = document.getElementById('scale-value');
    if (scaleSlider) {
        scaleSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            noiseMaterial.uniforms.uScale.value = value;
            scaleValue.textContent = value.toFixed(1);
        });
    }

    // Detail 슬라이더
    const detailSlider = document.getElementById('detail-slider');
    const detailValue = document.getElementById('detail-value');
    if (detailSlider) {
        detailSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            noiseMaterial.uniforms.uDetail.value = value;
            detailValue.textContent = value.toFixed(1);
        });
    }

    // Roughness 슬라이더
    const roughnessSlider = document.getElementById('roughness-slider');
    const roughnessValue = document.getElementById('roughness-value');
    if (roughnessSlider) {
        roughnessSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            noiseMaterial.uniforms.uRoughness.value = value;
            roughnessValue.textContent = value.toFixed(2);
        });
    }

    // Contrast 슬라이더
    const contrastSlider = document.getElementById('contrast-slider');
    const contrastValue = document.getElementById('contrast-value');
    if (contrastSlider) {
        contrastSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            noiseMaterial.uniforms.uContrast.value = value;
            contrastValue.textContent = value.toFixed(1);
        });
    }
}

// 슬라이더 컨트롤 초기화
setupSliderControls();

// 윈도우 리사이즈 이벤트
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

const elapsedTime = clock.getElapsedTime();

function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // 1. 노이즈 생성 (가상 메모리에 그림)
    noiseMaterial.uniforms.uTime.value = elapsedTime;
    renderer.setRenderTarget(noiseRenderTarget);
    renderer.render(noiseScene, noiseCamera);
    renderer.setRenderTarget(null);

    // 2. 합성 (노이즈 * 편자 이미지)
    combineMaterial.uniforms.tDiffuse1.value = noiseRenderTarget.texture;
    combineMaterial.uniforms.tDiffuse2.value = horseshoeTexture;

    renderer.setRenderTarget(combinedRenderTarget);
    renderer.render(combineScene, combineCamera);
    renderer.setRenderTarget(null); // 다시 화면으로 타겟 변경

    // [핵심 수정] 3. 최종 결과 화면에 그리기
    // combinedRenderTarget에 그려진 내용이 displayMesh의 텍스처로 입혀져서 보임
    renderer.render(scene, camera);
}

animate();