import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { NoiseShader, MultiplyShader } from '../constants/shaders';

/**
 * 좌측 패널 (드로잉 영역) 관리 커스텀 훅
 */
export function useLeftPanel(containerRef, canvasRef, uiCanvasRef) {
  const scenesRef = useRef({});
  const meshesRef = useRef({});
  const materialsRef = useRef({});
  const renderTargetsRef = useRef({});
  const rendererRef = useRef(null);
  const stateRef = useRef({
    isDrawing: false,
    lastX: 0,
    lastY: 0,
  });

  const handlersRef = useRef({});

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || !uiCanvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const LINE_RADIUS = 3;

    // --- Three.js 설정 ---
    const canvas = canvasRef.current;
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    const camera = new THREE.OrthographicCamera(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      0.1,
      1000
    );
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setSize(Math.floor(width), Math.floor(height));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    rendererRef.current = renderer;

    // --- UI Canvas (드로잉 캔버스) ---
    const uiCanvas = uiCanvasRef.current;
    const UI_CANVAS_SIZE = 256;
    uiCanvas.width = UI_CANVAS_SIZE;
    uiCanvas.height = UI_CANVAS_SIZE;
    const uiContext = uiCanvas.getContext('2d');
    uiContext.fillStyle = '#000000';
    uiContext.fillRect(0, 0, uiCanvas.width, uiCanvas.height);

    // --- Noise RenderTarget ---
    const noiseRenderTarget = new THREE.WebGLRenderTarget(1024, 1024, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    const noiseScene = new THREE.Scene();
    const noiseCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const noiseMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(NoiseShader.uniforms),
      vertexShader: NoiseShader.vertexShader,
      fragmentShader: NoiseShader.fragmentShader,
      side: THREE.DoubleSide,
    });

    const noiseGeometry = new THREE.PlaneGeometry(2, 2);
    const noiseMesh = new THREE.Mesh(noiseGeometry, noiseMaterial);
    noiseScene.add(noiseMesh);

    // --- Combined RenderTarget (노이즈 + 드로잉 합성) ---
    const combinedRenderTarget = new THREE.WebGLRenderTarget(1024, 1024);
    const combineScene = new THREE.Scene();
    const combineCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // HorseShoe 텍스처 로드 (placeholder)
    const horseshoeTexture = new THREE.TextureLoader().load(
      './assets/textures/HorseShoe_fill.png',
      undefined,
      undefined,
      () => console.error('Failed to load horseshoe texture')
    );

    const combineMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MultiplyShader.uniforms),
      vertexShader: MultiplyShader.vertexShader,
      fragmentShader: MultiplyShader.fragmentShader,
    });
    combineMaterial.uniforms.uBlurSize.value = 0.05;

    const combineMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), combineMaterial);
    combineScene.add(combineMesh);

    // --- Main Display ---
    const leftMaterial = new THREE.MeshBasicMaterial({
      map: combinedRenderTarget.texture,
      side: THREE.FrontSide,
    });

    const leftGeometry = new THREE.PlaneGeometry(width, height);
    const leftMesh = new THREE.Mesh(leftGeometry, leftMaterial);
    leftMesh.position.set(0, 0, 0);
    scene.add(leftMesh);

    // --- 드로잉 이벤트 핸들러 ---
    const handleMouseDown = (event) => {
      const rect = uiCanvas.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }

      stateRef.current.isDrawing = true;
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      stateRef.current.lastX = x;
      stateRef.current.lastY = y;
    };

    const handleMouseUp = () => {
      stateRef.current.isDrawing = false;
    };

    const handleMouseMove = (event) => {
      if (!stateRef.current.isDrawing) return;

      const rect = uiCanvas.getBoundingClientRect();
      const scaleX = uiCanvas.width / rect.width;
      const scaleY = uiCanvas.height / rect.height;

      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        return;
      }

      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      const dx = x - stateRef.current.lastX;
      const dy = y - stateRef.current.lastY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // --- 노이즈 파라미터 조절 ---
      // const speedFactor = distance * 0.02 - 0.02;
      // noiseMaterial.uniforms.uScale.value += speedFactor;
      // noiseMaterial.uniforms.uScale.value = Math.max(
      //   0.1,
      //   Math.min(5.0, noiseMaterial.uniforms.uScale.value)
      // );

      if (Math.abs(dx) > 1) {
        noiseMaterial.uniforms.uDetail.value += dx * 0.01;
        noiseMaterial.uniforms.uDetail.value = Math.max(
          1.0,
          Math.min(5.0, noiseMaterial.uniforms.uDetail.value)
        );
      }

      if (Math.abs(dy) > 1) {
        noiseMaterial.uniforms.uContrast.value += dy * 0.01;
        noiseMaterial.uniforms.uContrast.value = Math.max(
          0.5,
          Math.min(2.0, noiseMaterial.uniforms.uContrast.value)
        );
      }

      combineMaterial.uniforms.uBlurSize.value -= distance * 0.0001;
      combineMaterial.uniforms.uBlurSize.value = Math.max(
        0.005,
        combineMaterial.uniforms.uBlurSize.value
      );

      // --- 드로잉 ---
      const steps = Math.ceil(distance / (LINE_RADIUS * 0.25));

      uiContext.shadowBlur = 0;

      for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const interpX = stateRef.current.lastX + dx * t;
        const interpY = stateRef.current.lastY + dy * t;

        const grad = uiContext.createRadialGradient(
          interpX,
          interpY,
          0,
          interpX,
          interpY,
          LINE_RADIUS
        );

        grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        uiContext.fillStyle = grad;
        uiContext.beginPath();
        uiContext.arc(interpX, interpY, LINE_RADIUS, 0, Math.PI * 2);
        uiContext.fill();
      }

      stateRef.current.lastX = x;
      stateRef.current.lastY = y;
    };

    // --- 이벤트 리스너 등록 ---
    uiCanvas.addEventListener('mousedown', handleMouseDown);
    uiCanvas.addEventListener('mouseup', handleMouseUp);
    uiCanvas.addEventListener('mousemove', handleMouseMove);

    handlersRef.current = {
      handleMouseDown,
      handleMouseUp,
      handleMouseMove,
    };

    // --- 렌더 루프 ---
    const clock = new THREE.Clock();
    let animationId;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const deltaTime = clock.getDelta();

      if (stateRef.current.isDrawing) {
        noiseMaterial.uniforms.uTime.value += deltaTime;
      }

      // 1. 노이즈 생성
      renderer.setRenderTarget(noiseRenderTarget);
      renderer.render(noiseScene, noiseCamera);
      renderer.setRenderTarget(null);

      // 2. 합성
      // combineMaterial.uniforms.tDiffuse1.value = noiseRenderTarget.texture;
      // combineMaterial.uniforms.tDiffuse2.value = horseshoeTexture;

      // renderer.setRenderTarget(combinedRenderTarget);
      // renderer.render(combineScene, combineCamera);
      // renderer.setRenderTarget(null);

      // 3. 최종 렌더
      leftMaterial.map = noiseRenderTarget.texture;
      leftMaterial.needsUpdate = true;
      renderer.render(scene, camera);

      // 4. UI 파라미터 표시
      uiContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
      uiContext.fillRect(0, 0, 150, 90);

      uiContext.fillStyle = '#00ff00';
      uiContext.font = 'bold 12px Courier New';
      uiContext.textAlign = 'left';

      const scale = noiseMaterial.uniforms.uScale.value.toFixed(2);
      const detail = noiseMaterial.uniforms.uDetail.value.toFixed(2);
      const contrast = noiseMaterial.uniforms.uContrast.value.toFixed(2);
      const blurSize = combineMaterial.uniforms.uBlurSize.value.toFixed(5);

      uiContext.fillText(`Scale: ${scale}`, 10, 20);
      uiContext.fillText(`Detail: ${detail}`, 10, 35);
      uiContext.fillText(`Contrast: ${contrast}`, 10, 65);
      uiContext.fillText(`BlurSize: ${blurSize}`, 10, 80);
    };

    animate();

    // 참조 저장
    scenesRef.current = { scene, noiseScene, combineScene };
    materialsRef.current = { noiseMaterial, combineMaterial, leftMaterial };
    renderTargetsRef.current = { noiseRenderTarget, combinedRenderTarget };
    meshesRef.current = { noiseMesh, combineMesh, leftMesh };

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animationId);

      uiCanvas.removeEventListener('mousedown', handleMouseDown);
      uiCanvas.removeEventListener('mouseup', handleMouseUp);
      uiCanvas.removeEventListener('mousemove', handleMouseMove);

      renderer.dispose();
      noiseRenderTarget.dispose();
      combinedRenderTarget.dispose();
      noiseMaterial.dispose();
      combineMaterial.dispose();
      leftMaterial.dispose();
      noiseGeometry.dispose();
      leftGeometry.dispose();
    };
  }, []);

  return {
    applyNormalMap() {
      // 렌더러와 RenderTarget 반환
      return {
        combinedTarget: renderTargetsRef.current.combinedRenderTarget,
        renderer: rendererRef.current,
      };
    },
    getMaterials() {
      return materialsRef.current;
    },
  };
}
