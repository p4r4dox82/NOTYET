## React 앱에 통합하기

### 옵션 1: 전체 앱으로 사용

**App.jsx**:
```jsx
import React from 'react';
import { DrawingApp } from './react/components';
import './App.css';

export default function App() {
  return <DrawingApp />;
}
```

**App.css**:
```css
body, html, #root {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

#root {
  display: flex;
}
```

**main.jsx** (또는 index.js):
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

### 옵션 2: 페이지/라우트로 사용 (Next.js, Remix 등)

**pages/drawing.jsx** (또는 **app/drawing/page.jsx**):
```jsx
'use client'; // Next.js 13+ App Router인 경우

import { DrawingApp } from '@/react/components';
import styles from '@/styles/drawing.module.css';

export default function DrawingPage() {
  return (
    <div className={styles.page}>
      <DrawingApp />
    </div>
  );
}
```

**styles/drawing.module.css**:
```css
.page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
```

---

### 옵션 3: 모달/팝업으로 사용

```jsx
import { useState } from 'react';
import { DrawingApp } from './react/components';

export default function MyComponent() {
  const [showDrawing, setShowDrawing] = useState(false);

  if (!showDrawing) {
    return (
      <button onClick={() => setShowDrawing(true)}>
        드로잉 앱 열기
      </button>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <button
        onClick={() => setShowDrawing(false)}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 1001,
        }}
      >
        닫기
      </button>
      <DrawingApp />
    </div>
  );
}
```

---

### 옵션 4: 한쪽 패널만 사용

**좌측 패널만**:
```jsx
import { LeftPanel } from './react/components';
import { useState } from 'react';

export default function DrawingOnly() {
  const [result, setResult] = useState(null);

  return (
    <div style={{ width: '100%', height: 600 }}>
      <LeftPanel 
        onApplyClick={(target) => {
          console.log('드로잉 완료:', target);
          setResult(target);
        }} 
      />
      {result && <p>노멀맵이 생성되었습니다!</p>}
    </div>
  );
}
```

**우측 패널만**:
```jsx
import { RightPanel } from './react/components';
import { useEffect, useState } from 'react';
import * as THREE from 'three';

export default function Preview3D() {
  const [normalMap, setNormalMap] = useState(null);

  useEffect(() => {
    // 외부에서 노멀맵을 로드
    const loader = new THREE.TextureLoader();
    loader.load('/textures/my-normal-map.png', (texture) => {
      setNormalMap(texture);
    });
  }, []);

  return (
    <div style={{ width: '100%', height: 600 }}>
      <RightPanel normalMapTexture={normalMap} />
    </div>
  );
}
```

---

### 옵션 5: 상태 공유 (Context API)

**DrawingContext.js**:
```jsx
import { createContext, useState } from 'react';

export const DrawingContext = createContext();

export function DrawingProvider({ children }) {
  const [normalMapTexture, setNormalMapTexture] = useState(null);
  const [combinedRenderTarget, setCombinedRenderTarget] = useState(null);

  return (
    <DrawingContext.Provider value={{
      normalMapTexture,
      setNormalMapTexture,
      combinedRenderTarget,
      setCombinedRenderTarget,
    }}>
      {children}
    </DrawingContext.Provider>
  );
}
```

**App.jsx**:
```jsx
import { DrawingProvider } from './DrawingContext';
import DrawingPage from './pages/DrawingPage';

export default function App() {
  return (
    <DrawingProvider>
      <DrawingPage />
    </DrawingProvider>
  );
}
```

**DrawingPage.jsx**:
```jsx
import { useContext } from 'react';
import { DrawingContext } from './DrawingContext';
import { LeftPanel, RightPanel } from './react/components';

export default function DrawingPage() {
  const { setNormalMapTexture } = useContext(DrawingContext);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <LeftPanel 
        onApplyClick={(target) => {
          setNormalMapTexture(target.texture);
        }} 
      />
      <RightPanel normalMapTexture={useContext(DrawingContext).normalMapTexture} />
    </div>
  );
}
```

---

### 패키지 설치

```bash
npm install three
# 또는
yarn add three
# 또는
pnpm add three
```

### 빌드 설정 (Vite)

**vite.config.js** (필요시):
```js
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['three'],
  },
})
```

### 빌드 설정 (Webpack/Create React App)

일반적으로 따로 설정 불필요. CRA는 자동으로 처리합니다.

---

### 환경 변수 (선택사항)

**.env**:
```
VITE_TEXTURE_PATH=/assets/textures
VITE_HDRI_PATH=/assets/textures/0_hdri
```

**threeUtils.js 수정**:
```js
const path = import.meta.env.VITE_TEXTURE_PATH || './assets/textures';
```

---

### 문제 해결

**"three is not defined" 에러**:
```jsx
// 파일 상단에 추가
import * as THREE from 'three';
```

**WebGL 지원 확인**:
```js
function isWebGLSupported() {
  const canvas = document.createElement('canvas');
  return !!(
    window.WebGLRenderingContext && 
    (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
  );
}
```

**성능 최적화**:
- 렌더 타겟 해상도를 낮춤
- 브러시 크기를 줄임
- 컴포넌트를 React.memo로 감싸기

---

### 배포 시 주의사항

1. **정적 에셋 경로**: `public/` 폴더에 텍스처 배치
2. **CORS**: 외부 CDN에서 로드할 경우 CORS 설정 필요
3. **번들 크기**: three.js는 약 500KB (gzip: 150KB)

---

문제가 있으면 react 폴더의 README.md를 참고하세요!
