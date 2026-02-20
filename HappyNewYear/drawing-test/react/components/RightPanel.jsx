import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRightPanel } from '../hooks/useRightPanel';
import styles from './RightPanel.module.css';

/**
 * 우측 패널 컴포넌트 (3D 시각화)
 */
export function RightPanel({ normalMapTexture, combinedRenderTarget, renderer }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const rightPanelRef = useRef(null);

  rightPanelRef.current = useRightPanel(containerRef, canvasRef, normalMapTexture);

  // normalMapTexture가 변경될 때만 updateNormalMap 호출
  useEffect(() => {
    console.log('RightPanel useEffect triggered, normalMapTexture:', normalMapTexture);
    if (rightPanelRef.current && rightPanelRef.current.updateNormalMap && normalMapTexture) {
      console.log('RightPanel: Updating normal map');
      const result = rightPanelRef.current.updateNormalMap(normalMapTexture);
      console.log('updateNormalMap result:', result);
    } else {
      console.warn('RightPanel: Cannot update - missing updateNormalMap or normalMapTexture');
    }
  }, [normalMapTexture]);

  return (
    <div ref={containerRef} className={styles.rightPanel}>
      <canvas 
        ref={canvasRef} 
        className={styles.canvas}
        width={1024}
        height={1024}
      />
    </div>
  );
}

export default RightPanel;