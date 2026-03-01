import React, { useRef } from 'react';
import { useShaderComparison } from '../hooks/useShaderComparison';
import styles from './ShaderComparison.module.css';

/**
 * 3개의 Shader를 비교하는 컴포넌트
 * 화면을 3등분하여 각각의 shader를 렌더링합니다.
 * 하나의 canvas에 viewport 분할로 처리합니다.
 */
export function ShaderComparison() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  const shaderComparison = useShaderComparison(containerRef, canvasRef, overlayCanvasRef);

  return (
    <div className={styles.shaderComparison}>
      <div className={styles.mainContainer} ref={containerRef}>
        <canvas 
          ref={canvasRef} 
          className={styles.mainCanvas}
        />
        {/* 각 섹션 라벨 */}
        <div className={styles.label} style={{ left: '16.67%' }}>Shader 1</div>
        <div className={styles.label} style={{ left: '50%' }}>Shader 2</div>
        <div className={styles.label} style={{ left: '83.33%' }}>Shader 3</div>
      </div>
      {/* 공용 드로잉 오버레이 캔버스 */}
      <canvas
        ref={overlayCanvasRef}
        className={styles.overlayCanvas}
        title="드로잉 영역 (마우스로 드래그)"
      />
    </div>
  );
}

export default ShaderComparison;
