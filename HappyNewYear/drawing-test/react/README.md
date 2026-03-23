# Three.js Drawing App - React 구성

이 폴더는 기존 Three.js 그리기 앱을 React 컴포넌트로 변환한 것입니다.

## 📁 폴더 구조

```
react/
├── components/          # React 컴포넌트들
│   ├── DrawingApp.jsx   # 메인 컴포넌트 (좌측/우측 패널 조합)
│   ├── LeftPanel.jsx    # 좌측 패널 (그리기 영역)
│   ├── RightPanel.jsx   # 우측 패널 (3D 시각화)
│   ├── *.module.css     # 스타일 시트
│   └── index.js         # 컴포넌트 내보내기
├── hooks/               # 커스텀 React 훅
│   ├── useLeftPanel.js  # 좌측 패널 Three.js 로직
│   ├── useRightPanel.js # 우측 패널 Three.js 로직
│   └── index.js         # 훅 내보내기
├── utils/               # 유틸리티 함수
│   ├── threeUtils.js    # Three.js 헬퍼 함수들
│   └── index.js         # 유틸리티 내보내기
├── constants/           # 상수 및 설정
│   ├── shaders.js       # 셰이더 정의
│   └── index.js         # 상수 내보내기
└── README.md            # 이 파일
```

## 🚀 사용 방법

### 1. 기본 설치
기존 React 프로젝트에서:

```bash
npm install three
```

### 2. React 컴포넌트 사용

```jsx
import { DrawingApp } from './react/components';

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <DrawingApp />
    </div>
  );
}
```

### 3. 개별 패널만 사용 (선택사항)

```jsx
import { LeftPanel, RightPanel } from './react/components';
import { useState } from 'react';

export default function MyApp() {
  const [normalMap, setNormalMap] = useState(null);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <LeftPanel onApplyClick={(target) => setNormalMap(target.texture)} />
      <RightPanel normalMapTexture={normalMap} />
    </div>
  );
}
```

## 🎨 주요 컴포넌트 설명

### DrawingApp
메인 컨테이너 컴포넌트로 LeftPanel과 RightPanel을 조합합니다.

**Props**: 없음
**내부 상태**: 
- `normalMapTexture` - 우측 패널에 전달할 노멀맵 텍스처

### LeftPanel
좌측 그리기 영역을 담당합니다.

**Props**:
- `onApplyClick`: `(combinedRenderTarget) => void` - "Apply Normal Map" 버튼 클릭 콜백

**기능**:
- 드로잉 캔버스 (UI Canvas)
- 노이즈 생성 및 파라미터 제어
- 드로잉 결과와 노이즈 합성

### RightPanel
우측 3D 시각화 영역을 담당합니다.

**Props**:
- `normalMapTexture`: `THREE.Texture | null` - 노멀맵 텍스처
- `combinedRenderTarget`: `THREE.WebGLRenderTarget | null` - 합성된 렌더 타겟
- `renderer`: `THREE.WebGLRenderer | null` - Three.js 렌더러 (선택사항)

**기능**:
- 3D 평면 메시 표시
- 좌측에서 생성한 노멀맵 적용
- OrbitControls로 화면 조작 가능
- 조명 및 재질 설정

## 🔌 커스텀 훅

### useLeftPanel
좌측 패널의 Three.js 장면, 렌더러, 셰이더를 관리합니다.

```js
const leftPanel = useLeftPanel(containerRef, canvasRef, uiCanvasRef);

// 노멀맵 생성 (Apply 버튼 클릭 시)
const combinedTarget = leftPanel.applyNormalMap();

// 재질 정보 가져오기
const materials = leftPanel.getMaterials();
```

### useRightPanel
우측 패널의 3D 장면, 카메라, 재질을 관리합니다.

```js
const rightPanel = useRightPanel(containerRef, canvasRef, normalMapTexture);

// 노멀맵 업데이트
rightPanel.updateNormalMap(newTexture);
```

## 🎯 드로잉 인터랙션

좌측 UI 캔버스 위에서:
- **마우스 드래그**: 그리기
- **빠르게 움직임**: 노이즈 Scale 증가
- **느리게 움직임**: 노이즈 Scale 감소
- **왼쪽/오른쪽**: 노이즈 Detail 조절
- **위/아래**: 노이즈 Contrast 조절

## 📝 주요 파일 설명

### shaders.js
- `NoiseShader`: Simplex 노이즈 생성 셰이더
- `MultiplyShader`: 노이즈와 이미지 합성 셰이더

### threeUtils.js
- `heightToNormal()`: 높이맵 → 노멀맵 변환
- `createNormalMapTexture()`: 노멀맵 텍스처 생성
- `loadTexture()`: 텍스처 로드 유틸
- `loadHDRI()`: HDRI 환경맵 로드

### 텍스처 경로
프로젝트 루트 기준:
```
assets/textures/
├── Snow001_4K-JPG/
│   └── Snow001_4K-JPG_[Color|NormalGL|Roughness].jpg
└── 0_hdri/
    └── snowy_cemetery_4k.hdr
```

## ⚠️ 주의사항

1. **Three.js 버전**: three@1.31+ 필요
2. **CSS Modules**: 프로젝트가 CSS Modules를 지원해야 함
3. **정적 에셋 경로**: `public/assets/` 폴더에 텍스처 파일 배치
4. **성능**: 큰 화면에서는 렌더 타겟 해상도 조정 필요

## 🔧 커스터마이징

### 캔버스 해상도 변경
`useLeftPanel.js`에서:
```js
const noiseRenderTarget = new THREE.WebGLRenderTarget(1024, 1024);
const combinedRenderTarget = new THREE.WebGLRenderTarget(1024, 1024);
```

### 드로잉 브러시 크기 변경
```js
const LINE_RADIUS = 3; // 이 값 조정
```

### 노멀맵 강도 변경
`useRightPanel.js`에서:
```js
normalScale: new THREE.Vector2(0.8, 0.8), // 이 값 조정
```

## 📦 의존성

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "three": "^0.131.0"
  }
}
```

## 📄 라이센스

원본 코드를 기반으로 합니다.
