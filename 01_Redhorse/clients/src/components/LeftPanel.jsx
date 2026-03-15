import React, { useRef } from 'react';
import { useLeftPanel } from '../hooks/useLeftPanel';
import styles from './LeftPanel.module.css';

/**
 * 좌측 패널 컴포넌트 (드로잉 영역)
 */
export function LeftPanel({ onApplyClick }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const uiCanvasRef = useRef(null);

  const leftPanel = useLeftPanel(containerRef, canvasRef, uiCanvasRef);

  const handleApplyButtonClick = () => {
    console.log('Apply button clicked');
    const result = leftPanel.applyNormalMap();
    console.log('result:', result);
    
    if (result && result.combinedTarget && result.renderer) {
      console.log('Renderer found:', result.renderer);
      if (onApplyClick) {
        onApplyClick(result.combinedTarget, result.renderer);
      }
    } else {
      console.warn('No result or missing renderer');
    }
  };

  return (
    <div ref={containerRef} className={styles.leftPanel}>
      <canvas 
        ref={canvasRef} 
        className={styles.canvas}
        width={1024}
        height={1024}
      />
      <canvas
        ref={uiCanvasRef}
        className={styles.uiCanvas}
        title="그리기 영역 (마우스로 드래그)"
      />
      <button className={styles.applyButton} onClick={handleApplyButtonClick}>
        Apply Normal Map
      </button>
    </div>
  );
}

export default LeftPanel;
