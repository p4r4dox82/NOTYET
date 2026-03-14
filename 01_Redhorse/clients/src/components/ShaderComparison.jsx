import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { useShaderComparison } from '../hooks/useShaderComparison';
import styles from './ShaderComparison.module.css';

/**
 * 다양한 Shader를 렌더링하는 컴포넌트
 * @param {number} defaultMode - 기본 shaderMode (기본값: 1)
 * @param {boolean} showButtons - 모드 선택 버튼 표시 여부 (기본값: true)
 */
export const ShaderComparison = forwardRef(({ defaultMode = 1, showButtons = true }, ref) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const allMaterialsRef = useRef({});
  
  const [shaderMode, setShaderMode] = useState(defaultMode);

  useShaderComparison(containerRef, canvasRef, overlayCanvasRef, shaderMode, allMaterialsRef);

  // 외부에서 shader parameters를 조절할 수 있도록 ref 노출
  useImperativeHandle(ref, () => ({
    updateShaderParameters: (callback) => {
      if (allMaterialsRef.current) {
        callback(allMaterialsRef.current, shaderMode);
      }
    },
    setShaderMode: (mode) => {
      setShaderMode(mode);
    },
    getAllMaterials: () => allMaterialsRef.current,
  }), [shaderMode]);

  return (
    <div className={styles.shaderComparison}>
      {/* 버튼 그룹 */}
      {showButtons && (
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
        <button 
          className={shaderMode === 6 ? styles.buttonActive : styles.button}
          onClick={() => setShaderMode(6)}
        >
          6: Blur Line
        </button>
        <button 
          className={shaderMode === 7 ? styles.buttonActive : styles.button}
          onClick={() => setShaderMode(7)}
        >
          7: Comp Over
        </button>
        </div>
      )}

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
});

ShaderComparison.displayName = 'ShaderComparison';

export default ShaderComparison;
