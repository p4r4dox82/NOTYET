# React 변환 완료 📦

기존의 Three.js 그리기 앱을 다음과 같이 React 프로젝트에 통합 가능하도록 정리했습니다.

## 📁 생성된 파일 구조

```
drawing-test/
├── react/                           # 새로 생성된 React 폴더
│   ├── components/
│   │   ├── DrawingApp.jsx          # 메인 컴포넌트 (좌측+우측 패널)
│   │   ├── LeftPanel.jsx           # 좌측 패널 컴포넌트 (드로잉 영역)
│   │   ├── RightPanel.jsx          # 우측 패널 컴포넌트 (3D 시각화)
│   │   ├── DrawingApp.module.css
│   │   ├── LeftPanel.module.css
│   │   ├── RightPanel.module.css
│   │   └── index.js                # 컴포넌트 내보내기
│   ├── hooks/
│   │   ├── useLeftPanel.js         # 좌측 패널 Three.js 로직 훅
│   │   ├── useRightPanel.js        # 우측 패널 Three.js 로직 훅
│   │   └── index.js                # 훅 내보내기
│   ├── utils/
│   │   ├── threeUtils.js           # Three.js 유틸리티 함수들
│   │   └── index.js                # 유틸리티 내보내기
│   ├── constants/
│   │   ├── shaders.js              # NoiseShader, MultiplyShader 정의
│   │   └── index.js                # 상수 내보내기
│   ├── README.md                   # 컴포넌트 사용 설명서
│   ├── INTEGRATION_GUIDE.md        # 기존 React 앱에 통합하는 방법
│   └── SETUP.md                    # 이 파일
│
├── app.js                          # (기존 파일)
├── main.js                         # (기존 파일)
├── index.html                      # (기존 파일)
└── assets/                         # (기존 파일)
```

## 🎯 주요 변경사항

### 기존 구조
- 전역 변수로 Three.js 객체 관리
- HTML에서 직접 canvas 요소 조작
- 단일 script 파일

### 새로운 React 구조
- React Custom Hooks로 Three.js 로직 캡슐화
- 컴포넌트별 독립적인 렌더링
- 모듈화된 파일 구조
- Props를 통한 데이터 전달
- 자동 cleanup 처리

## 📝 파일별 설명

### 컴포넌트 (components/)

#### DrawingApp.jsx
```jsx
// 사용 예
<DrawingApp /> // 전체 앱 렌더링
```
- 핵심: LeftPanel과 RightPanel을 조합하는 메인 컴포넌트
- 상태: normalMapTexture, combinedRenderTarget 관리
- Props 없음 (독립 실행 가능)

#### LeftPanel.jsx
```jsx
// 사용 예
<LeftPanel onApplyClick={(target) => {}}>
```
- 좌측 그리기 영역 관리
- Props:
  - `onApplyClick`: (combinedRenderTarget) => void
- useLeftPanel 훅 사용

#### RightPanel.jsx
```jsx
// 사용 예
<RightPanel normalMapTexture={textureObject} />
```
- 우측 3D 시각화 관리
- Props:
  - `normalMapTexture`: THREE.Texture
  - `combinedRenderTarget`: THREE.WebGLRenderTarget
  - `renderer`: THREE.WebGLRenderer
- useRightPanel 훅 사용

### 훅 (hooks/)

#### useLeftPanel.js
**매개변수:**
```js
useLeftPanel(containerRef, canvasRef, uiCanvasRef)
```

**반환값:**
```js
{
  applyNormalMap(): WebGLRenderTarget,
  getMaterials(): { noiseMaterial, combineMaterial, leftMaterial }
}
```

**기능:**
- Three.js 장면, 렌더러, 셰이더 초기화
- 드로잉 캔버스 이벤트 처리
- 렌더 루프 실행 및 정리

#### useRightPanel.js
**매개변수:**
```js
useRightPanel(containerRef, canvasRef, normalMapTexture)
```

**반환값:**
```js
{
  updateNormalMap(texture): void
}
```

**기능:**
- Three.js 장면, 카메라, 렌더러 초기화
- PBR 재질 적용
- OrbitControls 설정
- 자동 리사이징

### 유틸리티 (utils/)

**heightToNormal**(srcCanvas, dstContext, intensity)
- 높이맵을 노멀맵으로 변환
- Sobel 필터 기반

**createNormalMapTexture**(source, renderer, width, height)
- WebGLRenderTarget 또는 Canvas → 노멀맵 텍스처
- 자동으로 크기 조정 및 Y축 반전 처리

**createLeftTexture**(width, height)
- 검은색 캔버스 생성 (초기값)

**loadTexture**(path, textureLoader)
- 텍스처 로드 (ClampToEdgeWrapping 적용)

**loadHDRI**(path, renderer, scene)
- HDRI 환경맵 로드 (Promise 반환)

### 상수 (constants/)

**NoiseShader**
```js
{
  uniforms: { uTime, uScale, uDetail, uRoughness, uContrast },
  vertexShader: "...",
  fragmentShader: "..." // Simplex noise
}
```

**MultiplyShader**
```js
{
  uniforms: { tDiffuse1, tDiffuse2, uBlurSize },
  vertexShader: "...",
  fragmentShader: "..." // Gaussian blur + composite
}
```

## 🚀 빠른 시작

### React 프로젝트에서 사용

```jsx
import { DrawingApp } from './react/components';

export default function App() {
  return <DrawingApp />;
}
```

### 필수 환경

```bash
npm install react react-dom three
```

### 텍스처 파일 준비

프로젝트의 `public/assets/` 폴더에:
```
assets/
├── textures/
│   ├── Snow001_4K-JPG/
│   │   ├── Snow001_4K-JPG_Color.jpg
│   │   ├── Snow001_4K-JPG_NormalGL.jpg
│   │   ├── Snow001_4K-JPG_Roughness.jpg
│   │   └── HorseShoe_fill.png
│   └── 0_hdri/
│       └── snowy_cemetery_4k.hdr
```

## 🔄 데이터 흐름

```
사용자 입력 (마우스)
    ↓
LeftPanel (UI Canvas)
    ↓
noiseShader → 노이즈 생성 (RenderTarget1)
    ↓
multiplyShader → 드로잉과 합성 (RenderTarget2)
    ↓
"Apply Normal Map" 버튼 클릭
    ↓
heightToNormal() 변환
    ↓
RightPanel의 normalMapTexture 업데이트
    ↓
3D 메시 재질에 적용
    ↓
실시간 렌더링
```

## ⚠️ 주의사항

1. **CSS Modules 지원 확인**
   - Create React App: ✅ 자동 지원
   - Vite: ✅ 자동 지원
   - Next.js: ✅ 자동 지원

2. **정적 에셋 경로**
   - 상대 경로: `./assets/`
   - 절대 경로: `/assets/` (public 폴더)

3. **성능 고려사항**
   - 렌더 타겟 해상도: 1024×1024 (조정 가능)
   - 큰 모니터: 해상도 관련 부분 최적화 필요

4. **브라우저 호환성**
   - WebGL 필수
   - Chrome, Firefox, Safari (최신 버전)

## 📚 추가 참고자료

- [react/README.md](./react/README.md) - 상세 컴포넌트 문서
- [react/INTEGRATION_GUIDE.md](./react/INTEGRATION_GUIDE.md) - 통합 예제
- [Three.js 공식 문서](https://threejs.org/docs/index.html)

## 🎓 주요 개념

### Custom Hooks 사용
Three.js 장면 관리를 React Hooks로 캡슐화하여:
- 컴포넌트 재사용성 ↑
- 상태 관리 명확화
- 자동 cleanup 처리

### 렌더링 파이프라인
```
requestAnimationFrame (매 프레임)
  ├─ 노이즈 생성 (RenderTarget1)
  ├─ 합성 (RenderTarget2)
  ├─ 최종 렌더 (화면)
  └─ UI 다시 그리기
```

### 텍스처 합성
```
Noise Texture × Drawing Texture = Combined Texture
                                  ↓ (heightToNormal)
                                  Normal Map
                                  ↓ (적용)
                                  3D 메시
```

## 💡 커스터마이징 팁

### 좌측 패널 색상 변경
```js
// useLeftPanel.js
scene.background = new THREE.Color(0x1a1a1a); // 원하는 색상
```

### 우측 패널 조명 강도
```js
// useRightPanel.js
mainLight.intensity = 0.4; // 더 밝게하려면 증가
```

### 드로잉 브러시 크기
```js
// useLeftPanel.js
const LINE_RADIUS = 3; // 더 크게하려면 증가
```

### 노이즈 기본값
```js
// constants/shaders.js
uniforms: {
  uScale: { value: 0.0 },        // 초기값
  uDetail: { value: 4.0 },
  uRoughness: { value: 0.3 },
  uContrast: { value: 2.0 },
}
```

---

**이제 React 프로젝트에서 완전히 모듈화된 Three.js 앱을 사용할 수 있습니다! 🎉**
