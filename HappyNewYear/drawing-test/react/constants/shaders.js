// NoiseShader - TouchDesigner 스타일의 노이즈 생성
// export const NoiseShader = {
//   uniforms: {
//     uTime: { value: 0 },
//     uScale: { value: 0.0 },
//     uDetail: { value: 4.0 },
//     uRoughness: { value: 0.3 },
//     uContrast: { value: 2.0 },
//   },
//   vertexShader: `
//     varying vec2 vUv;
//     void main() {
//       vUv = uv;
//       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//     }
//   `,
//   fragmentShader: `
//     uniform float uTime;
//     uniform float uScale;
//     uniform float uDetail;
//     uniform float uRoughness;
//     uniform float uContrast;
//     varying vec2 vUv;

//     vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
//     vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
//     vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
//     vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

//     float snoise(vec3 v) {
//       const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
//       const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

//       vec3 i  = floor(v + dot(v, C.yyy) );
//       vec3 x0 = v - i + dot(i, C.xxx) ;

//       vec3 g = step(x0.yzx, x0.xyz);
//       vec3 l = 1.0 - g;
//       vec3 i1 = min( g.xyz, l.zxy );
//       vec3 i2 = max( g.xyz, l.zxy );

//       vec3 x1 = x0 - i1 + C.xxx;
//       vec3 x2 = x0 - i2 + C.yyy;
//       vec3 x3 = x0 - D.yyy;

//       i = mod289(i);
//       vec4 p = permute( permute( permute(
//                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
//               + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
//               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

//       float n_ = 0.142857142857;
//       vec3  ns = n_ * D.wyz - D.xzx;

//       vec4 j = p - 49.0 * floor(p * n_ * n_);

//       vec4 x_ = floor(j * ns.z);
//       vec4 y_ = floor(j - 7.0 * x_ );

//       vec4 x = x_ *ns.x + ns.yyyy;
//       vec4 y = y_ *ns.x + ns.yyyy;
//       vec4 h = 1.0 - abs(x) - abs(y);

//       vec4 b0 = vec4( x.xy, y.xy );
//       vec4 b1 = vec4( x.zw, y.zw );

//       vec4 s0 = floor(b0)*2.0 + 1.0;
//       vec4 s1 = floor(b1)*2.0 + 1.0;
//       vec4 sh = -step(h, vec4(0.0));

//       vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
//       vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

//       vec3 p0 = vec3(a0.xy,h.x);
//       vec3 p1 = vec3(a0.zw,h.y);
//       vec3 p2 = vec3(a1.xy,h.z);
//       vec3 p3 = vec3(a1.zw,h.w);

//       vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
//       p0 *= norm.x;
//       p1 *= norm.y;
//       p2 *= norm.z;
//       p3 *= norm.w;

//       vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
//       m = m * m;
//       return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
//                                     dot(p2,x2), dot(p3,x3) ) );
//     }

//     float fbm(vec3 x) {
//       float v = 0.0;
//       float a = 0.5;
//       vec3 shift = vec3(100.0);
//       for (int i = 0; i < 5; ++i) {
//         if(float(i) >= uDetail) break;
//         v += a * snoise(x);
//         x = x * 2.0 + shift;
//         a *= uRoughness;
//       }
//       return v;
//     }

//     void main() {
//       vec3 coord = vec3(vUv * uScale, uTime * 0.2); 
//       float noiseValue = fbm(coord);
//       noiseValue = noiseValue * 0.5 + 0.5;
//       noiseValue = (noiseValue - 0.5) * uContrast + 0.5;
//       noiseValue = clamp(noiseValue, 0.0, 1.0);
//       gl_FragColor = vec4(vec3(noiseValue), 1.0);
//     }
//   `
// };

export const NoiseShader = {
  uniforms: {
    uTime: { value: 0 },
    uScale: { value: 2.0 },
    uHarmonics: { value: 2.0 },       // int -> float로 변경 (안전성)
    uHarmonicSpread: { value: 2.0 }, 
    uHarmonicGain: { value: 0.45 },   
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

      float expGray = pow(mapGray, 2.8); // (0, 1)

      return expGray;
    }

    float fbm(vec3 x) {
      float v = 0.0;
      float a = 1.0; 
      vec3 shift = vec3(0.0); // 겹칠 때 위치를 살짝 비틀어줌 (자연스러움 상승)

      if (uHarmonics < 1.0) {
        return snoise_scaling(x);
      }
      
      for (int i = 0; i < 10; ++i) { 
        if(float(i) >= uHarmonics) {
          break;
        }
        v += a * snoise_scaling(x);
        x = x * uHarmonicSpread;
        a *= uHarmonicGain;      
      }
      return v;
    }

    void main() {
      // 1. 화면 스케일을 3.0으로 고정 (적당히 확대해서 보기)
      vec3 coord = vec3(vUv * 3.5, uTime * 0.2); 
      
      float n = fbm(coord);

      vec3 debugColor;

      if (n > 0.1) {
        // n이 0.8을 넘으면 '순수 빨강'
        debugColor = vec3(1.0, 0.0, 0.0); 
      } 
      else {
        // 그 외의 낮은 값들은 어두운 흑백으로 처리해서 배경으로 묻히게 만듭니다.
        // float gray = n * 0.5 + 0.5; // 화면에 보이게 0~1로 매핑
        debugColor = vec3(n); // 0.3을 곱해 아주 어둡게 누름
      }

      gl_FragColor = vec4(debugColor, 1.0);
    }
  `
};


// MultiplyShader - 노이즈와 드로잉 이미지 합성
export const MultiplyShader = {
    uniforms: {
        tDiffuse1: { value: null },
        tDiffuse2: { value: null },
        uBlurSize: { value: 0.003 }
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

        float getWeight(float x, float y) {
            float sigma = 2.0;
            return exp(-(x*x + y*y) / (2.0 * sigma * sigma));
        }

        void main() {
            vec2 noiseUV = vec2(abs(vUv.x - 0.5) * 2.0, vUv.y);
            vec4 noise = texture2D(tDiffuse1, noiseUV);

            vec4 blurredColor = vec4(0.0);
            float totalWeight = 0.0;
            
            const float radius = 4.0; 

            for(float x = -radius; x <= radius; x += 1.0) {
                for(float y = -radius; y <= radius; y += 1.0) {
                    vec2 offset = vec2(x, y) * uBlurSize;
                    float weight = getWeight(x, y);
                    blurredColor += texture2D(tDiffuse2, vUv + offset) * weight;
                    totalWeight += weight;
                }
            }

            blurredColor /= totalWeight;
            float mask = blurredColor.a;
            vec3 finalColor = noise.rgb * mask;
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `
};
