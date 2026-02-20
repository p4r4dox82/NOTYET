import React, { useRef, useState, useEffect, useCallback } from 'react';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { createNormalMapTexture } from '../utils/threeUtils';
import * as THREE from 'three';
import styles from './DrawingApp.module.css';

/**
 * 메인 드로잉 앱 컴포넌트
 * 좌측: 드로잉 영역
 * 우측: 3D 시각화
 */
export function DrawingApp() {
  const [normalMapTexture, setNormalMapTexture] = useState(null);
  const rendererRef = useRef(null);

  const handleApplyNormalMap = useCallback((combinedTarget, renderer) => {
    console.log('handleApplyNormalMap called with:', combinedTarget);
    
    try {
      if (combinedTarget && renderer) {
        // RenderTarget 타깃이 1024x1024이므로 해당 크기로 노멀맵 생성
        const normalMapCanvas = createNormalMapTexture(combinedTarget, renderer, 1024, 1024);
        const texture = new THREE.CanvasTexture(normalMapCanvas);
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        
        console.log('New Normal map texture created:', texture);
        setNormalMapTexture(texture);
        rendererRef.current = renderer;
      }
    } catch (error) {
      console.error('Error creating normal map:', error);
    }
  }, []);

  return (
    <div className={styles.container}>
      <LeftPanel onApplyClick={handleApplyNormalMap} />
      <RightPanel
        normalMapTexture={normalMapTexture}
      />
    </div>
  );
}

export default DrawingApp;
