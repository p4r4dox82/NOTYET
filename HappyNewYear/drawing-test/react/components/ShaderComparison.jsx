import React, { useRef } from 'react';
import { useShaderComparison } from '../hooks/useShaderComparison';
import styles from './ShaderComparison.module.css';

/**
 * 3개의 Shader를 비교하는 컴포넌트
 * 화면을 3등분하여 각각의 shader를 렌더링합니다.
 * 독립적인 오버레이 캔버스로 드로잉을 관리합니다.
 */
export function ShaderComparison() {
  const containerRefs = [useRef(null), useRef(null), useRef(null)];
  const canvasRefs = [useRef(null), useRef(null), useRef(null)];
  const overlayCanvasRef = useRef(null);

  const shaderComparison = useShaderComparison(containerRefs, canvasRefs, overlayCanvasRef);

  return (
    <div className={styles.shaderComparison}>
      {[0, 1, 2].map((index) => (
        <div 
          key={index}
          className={styles.shaderContainer} 
          ref={containerRefs[index]}
        >
          <canvas 
            ref={canvasRefs[index]} 
            className={styles.canvas}
            width={512}
            height={512}
          />
          <div className={styles.label}>Shader {index + 1}</div>
        </div>
      ))}
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
