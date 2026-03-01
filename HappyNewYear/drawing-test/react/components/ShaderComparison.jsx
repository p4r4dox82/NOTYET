import React, { useRef, useState } from 'react';
import { useShaderComparison } from '../hooks/useShaderComparison';
import styles from './ShaderComparison.module.css';

/**
 * 다양한 Shader를 렌더링하는 컴포넌트
 */
export function ShaderComparison() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  
  const [shaderMode, setShaderMode] = useState(1);

  const shaderComparison = useShaderComparison(containerRef, canvasRef, overlayCanvasRef, shaderMode);

  return (
    <div className={styles.shaderComparison}>
      {/* 버튼 그룹 */}
      <div className={styles.buttonContainer}>
        <button 
          className={shaderMode === 1 ? styles.buttonActive : styles.button}
          onClick={() => setShaderMode(1)}
        >
          1: Noise
        </button>
        <button 
          className={shaderMode === 2 ? styles.buttonActive : styles.button}
          onClick={() => setShaderMode(2)}
        >
          2: Ramp
        </button>
        <button 
          className={shaderMode === 3 ? styles.buttonActive : styles.button}
          onClick={() => setShaderMode(3)}
        >
          3: Comp Average
        </button>
        <button 
          className={shaderMode === 4 ? styles.buttonActive : styles.button}
          onClick={() => setShaderMode(4)}
        >
          4: Blur
        </button>
        <button 
          className={shaderMode === 5 ? styles.buttonActive : styles.button}
          onClick={() => setShaderMode(5)}
        >
          5: Comp Multiply
        </button>
      </div>

      <div className={styles.mainContainer} ref={containerRef}>
        <canvas 
          ref={canvasRef} 
          className={styles.mainCanvas}
        />
      </div>
      {/* 드로잉 오버레이 캔버스 */}
      <canvas
        ref={overlayCanvasRef}
        className={styles.overlayCanvas}
        title="드로잉 영역 (마우스로 드래그)"
      />
    </div>
  );
}

export default ShaderComparison;
