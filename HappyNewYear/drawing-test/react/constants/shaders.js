import * as THREE from 'three';

export const NoiseShader = {
  uniforms: {
    uTime: { value: 0 },
    uScale: { value: 2.0 },
    uHarmonics: { value: 3.0 },       // int -> float로 변경 (안전성)
    uHarmonicSpread: { value: 2.0 }, 
    uHarmonicGain: { value: 0.7 },   
    uExponent: { value: 1.0 },    
    uAmplitude: { value: 0.5 },   
    uOffset: { value: 0.5 },       
    uDetail: { value: 4.0 },
    uRoughness: { value: 0.3 },
    uContrast: { value: 2.0 },
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
    
    uniform float uHarmonics;       
    uniform float uHarmonicSpread;
    uniform float uHarmonicGain;
    uniform float uExponent;
    uniform float uAmplitude;
    uniform float uOffset;

    varying vec2 vUv;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    // main 함수 바깥(위)에 커스텀 함수를 선언합니다.
    float sigmoid(float x, float steepness) {
        // 중심을 0.5로 맞추고, steepness로 S곡선의 가파른 정도를 조절합니다.
        return 1.0 / (1.0 + exp(-steepness * (x)));
    }

    float inverseCustomSigmoid(float y, float steepness) {
        // 0으로 나누기나 log(0) 에러를 방지하기 위해 y값을 살짝 제한(Clamp)합니다.
        float safeY = clamp(y, 0.0001, 0.9999); 
        
        return - (1.0 / steepness) * log((1.0 - safeY) / safeY);
    }

    #define PI 3.14159265359

    // =========================================================
    // [TouchDesigner Mirror TOP 완벽 구현 함수]
    // uv: 원본 픽셀 좌표 (0.0 ~ 1.0)
    // pivot: 기준점 (기본값: vec2(0.5, 0.5) 정중앙)
    // angle: 반사면의 각도 (Degree 단위, 0~360)
    // =========================================================
    vec2 applyMirror(vec2 uv, vec2 pivot, float angle) {
        
        // 1. Degree를 Radian으로 변환
        float rad = angle * PI / 180.0;
        
        // 2. 중심점(Pivot)으로 좌표 이동
        vec2 p = uv - pivot;
        
        // 3. 좌표계 회전 (Angle만큼 반대 방향으로 돌려서 수직/수평 접기가 쉽도록 만듦)
        float c = cos(-rad);
        float s = sin(-rad);
        vec2 rotated = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
        
        // 4. [핵심] X축 기준 거울 반사 (오른쪽 면을 왼쪽으로 데칼코마니)
        // (원한다면 abs(rotated.y)를 쓰면 Y축 기준 반사가 됩니다)
        rotated.x = -abs(rotated.x); 
        
        // 5. 좌표계 원상복구 (다시 원래 각도대로 돌려놓기)
        c = cos(rad);
        s = sin(rad);
        vec2 unrotated = vec2(rotated.x * c - rotated.y * s, rotated.x * s + rotated.y * c);
        
        // 6. Pivot 위치로 복귀
        return unrotated + pivot;
    }

    vec2 applyKaleidoscope(vec2 uv, vec2 center, float segments) {
        
        // 1. 중심점을 기준으로 좌표계 이동
        vec2 st = uv - center;
        
        // 2. 현재 픽셀의 각도(angle)와 거리(radius) 구하기
        float angle = atan(st.y, st.x);
        float radius = length(st);
        
        // 3. 한 조각(Segment)의 각도 크기 구하기
        float segmentAngle = PI * 2.0 / segments;
        
        // 4. [핵심] 각도를 조각 크기로 나누고 소수점만 남겨서(mod) 무한 반복 접기!
        // mod(angle, segmentAngle)은 0.0 ~ 한조각 크기 사이를 톱니바퀴처럼 반복합니다.
        // abs()와 빼기를 조합해서 지그재그( /\/\/\ ) 형태로 각도를 접어줍니다.
        float foldedAngle = abs(mod(angle + segmentAngle / 2.0, segmentAngle) - segmentAngle / 2.0);
        
        // 5. 다시 원본 좌표계(X, Y)로 복구하기 (거리와 접힌 각도를 사용)
        vec2 foldedSt = vec2(cos(foldedAngle), sin(foldedAngle)) * radius;
        
        // 6. 중심점 원상복구
        return foldedSt + center;
    }

    vec2 applyFlip(vec2 uv, vec2 pivot, float enableFlipX, float enableFlipY) {
        vec2 result = uv;
        
        // 1. Flip X (좌우 반전)
        // 기준선(pivot.x)을 넘어가면 반대편으로 접어 넘깁니다.
        if (enableFlipX > 0.5) {
            result.x = pivot.x - abs(uv.x - pivot.x);
        }
        
        // 2. Flip Y (상하 반전)
        // 기준선(pivot.y)을 넘어가면 반대편으로 접어 넘깁니다.
        if (enableFlipY > 0.5) {
            result.y = pivot.y - abs(uv.y - pivot.y);
        }
        
        return result;
    }


    float snoise(vec3 v) {
      const vec2  C = vec2(1.0/6.0, 1.0/3.0);
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * n_ * n_);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    float snoise_scaling(vec3 x) {
      float n = snoise(x);

      float gray = n * 0.5 + 0.5; // -1~1 -> 0~1

      float sigGray = inverseCustomSigmoid(gray, 1.0) / 3.1; // (-1, 1)

      float mapGray = (sigGray * 0.5 + 0.5); // (0, 1)

      mapGray = clamp(mapGray, 0.0, 1.0);
      float expGray = pow(mapGray, 2.8); // (0, 1)

      return expGray;
    }

    float scaling(float x) {
      float gray = x * 0.5 + 0.5; // -1~1 -> 0~1

      float sigGray = inverseCustomSigmoid(gray, 1.0) / 3.1; // (-1, 1)

      float mapGray = (sigGray * 0.5 + 0.5); // (0, 1)

      mapGray = clamp(mapGray, 0.0, 1.0);
      float expGray = pow(mapGray, 2.8); // (0, 1)

      return expGray;
    }

     float fbm(vec3 x) {
        float v = 0.0;
        float a = 1.0;      // 0.5보단 1.0부터 시작하는 것이 계산이 직관적입니다.
        float maxAmp = 0.0; // [추가] 지금까지 더해진 진폭의 최대치 누적

        vec3 shift = vec3(100.0);

        for (int i = 0; i < 10; ++i) { 
          if(float(i) >= uHarmonics) break; 
          
          v += a * snoise(x);
          maxAmp += a; // 내가 더한 a만큼 최대 한계치도 늘려줌
          
          x = x * uHarmonicSpread + shift;
          a *= uHarmonicGain;      
        }
        
        // 1단계: 누적된 노이즈를 최대 한계치로 나누어 무조건 -1.0 ~ 1.0 비율로 만듦
        float normalizedNoise = v / maxAmp;
        
        // 2단계: Simplex의 한계점(±0.75)을 ±1.0 끝까지 닿도록 살짝 팽창(Scale)시켜줌
        // (1.3 대신 1.2~1.5 사이를 넣어가며 마음에 드는 흑백 대비를 찾으시면 됩니다)
        return normalizedNoise * 1.2; 
    }



    void main() {
      // 1. 수평(0도)으로 한번 접어서 상하 대칭을 만듦
      vec2 m1 = applyMirror(vUv, vec2(0.5, 0.5), 0.0);
      
      // 2. 90도로 접어서 좌우 대칭을 추가 (총 4등분 십자가 모양)
      vec2 m2 = applyMirror(m1, vec2(0.5, 0.5), 90.0);
      
      // 3. 45도로 비스듬히 접어서 대각선 대칭을 추가 (총 8등분 눈송이 모양!)
      vec2 finalUv = applyMirror(m2, vec2(0.5, 0.5), 45.0);
      // 1. 화면 스케일을 3.0으로 고정 (적당히 확대해서 보기)

      vec2 vUv_8 = applyKaleidoscope(vUv, vec2(0.5, 0.5), 4.0);
      
      vec3 coord = vec3(vUv_8 * 3.5, uTime * 0.2); 
      
      float n = fbm(coord);

      n = scaling(n);

      gl_FragColor = vec4(vec3(n), 1.0);
    }
  `
};

export const RampShader = {
  uniforms: {
    uPhase: { value: 0.0 },                         // 물결이 퍼져나가는 위상
    uPeriod: { value: 0.5 },                        // [핵심] 링의 두께 (작을수록 링이 많아짐)
    uCenter: { value: new THREE.Vector2(0.5, 0.5) },// 중심점 (0.5, 0.5가 정중앙)
    uAspect: { value: 1.0 }                         // 화면 비율 보정 (동그라미 찌그러짐 방지)
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uPhase;
    uniform float uPeriod;
    uniform vec2 uCenter;
    uniform float uAspect;

    #define PI 3.14159265359
    
    varying vec2 vUv;

    void main() {
      vec2 st = vUv - uCenter;
      st.x *= uAspect;
      float dist = length(st);

      // 1. 거리에 주기와 위상을 반영한 기본 값 구하기
      // (아직 무한 반복 처리 안 됨, 값이 계속 커지거나 작아짐)
      float t = (dist / uPeriod) - uPhase;

      
      // t를 2.0으로 나눈 나머지(0.0~2.0)에서 1.0을 빼면 -1.0 ~ 1.0이 됩니다.
      // 거기에 절대값(abs)을 씌우면 1.0 -> 0.0 -> 1.0 으로 완벽하게 왕복하는 값이 나옵니다!
      float val = abs(mod(t, 2.0) - 1.0);

      // (참고로, Extend가 Repeat(Hold) 일 때는 기존처럼 float val = fract(t); 를 씁니다.)

      float gray = pow(1.0 - val, 1.0);

      // float gray = pow(sin((0.5 - val) *PI), 5.0); // 0.0 ~ 1.0

      gl_FragColor = vec4(vec3(gray), 1.0);
    }
  `
};

export const CompShader = {
    uniforms: {
        tDiffuse1: { value: null },
        tDiffuse2: { value: null },
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
        varying vec2 vUv;

        void main() {
            vec4 texture1 = texture2D(tDiffuse1, vUv);
            vec4 texture2 = texture2D(tDiffuse2, vUv);
            
            // 간단한 곱셈 합성
            vec4 blended = texture1 * texture2;
            gl_FragColor = blended;
        }
    `
};

// MultiplyShader - 노이즈와 드로잉 이미지 합성
export const MultiplyShader = {
    uniforms: {
        tDiffuse1: { value: null },
        tDiffuse2: { value: null },
        uResolution: { value: new THREE.Vector2(1024, 1024) }, // 이미지의 가로/세로 해상도
        uBlurSize: { value: 8.0 }  // 블러의 강도 (값이 클수록 많이 뭉개짐)
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
        uniform vec2 uResolution;
        varying vec2 vUv;

        float getWeight(float x, float y) {
            float sigma = 2.0;
            return exp(-(x*x + y*y) / (2.0 * sigma * sigma));
        }

        float gaussian(float x, float sigma) {
            return exp(-(x * x) / (2.0 * sigma * sigma)) / (2.0 * 3.14159 * sigma * sigma);
        }

        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        void main() {
            vec4 noise = texture2D(tDiffuse1, vUv);

            vec4 blurredColor = vec4(0.0);
            float totalWeight = 0.0;

            vec2 texelSize = 1.0 / uResolution;

            const float radius = 4.0; 
            vec2 stepSize = texelSize * uBlurSize;

            for (float x = -radius; x <= radius; x += 1.0) {
              for (float y = -radius; y <= radius; y += 1.0) {
                // 1. 현재 픽셀에서 얼마만큼 떨어져 있는지 (오프셋)
                vec2 offset = vec2(x, y) * stepSize;
                
                // 2. 가우시안 가중치 계산 (중심은 무겁게, 멀어질수록 가볍게)
                // 거리의 제곱(x*x + y*y)을 넣어서 가중치를 구합니다.
                float weight = gaussian(sqrt(x*x + y*y), radius / 2.0);
                
                // 3. 주변 픽셀의 색상을 가져와 가중치를 곱해서 더함
                blurredColor += texture2D(tDiffuse2, vUv + offset) * weight;
                totalWeight += weight;
              }
            }

            // 전체 가중치 합으로 나누어 밝기를 원래대로 복구 (정규화)
            gl_FragColor = blurredColor / totalWeight;
            float mask = blurredColor.a;
            vec3 finalColor = noise.rgb * mask;
            float dither = (random(gl_FragCoord.xy) - 0.5) / 256.0;
            finalColor.rgb += dither;
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};
