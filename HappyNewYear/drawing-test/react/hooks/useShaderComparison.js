import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  NoiseShader,
  MultiplyShader,
  RampShader,
  CompShader,
} from "../constants/shaders";

/**
 * 3개의 Shader를 비교하는 커스텀 훅
 * 하나의 canvas에 viewport 분할을 통해 3개 shader를 렌더링
 */
export function useShaderComparison(
  containerRef,
  canvasRef,
  overlayCanvasRef,
) {
  const rendererRef = useRef(null);
  const scenesRef = useRef([null, null, null]);
  const materialsRef = useRef([null, null, null]);
  const renderTargetsRef = useRef([null, null, null]);
  const camerasRef = useRef([null, null, null]);
  const stateRef = useRef({
    isDrawing: false,
    lastX: 0,
    lastY: 0,
  });

  const handlersRef = useRef({});
  const animationIdRef = useRef(null);

  // --- 공통 Shader Scene/Material 저장 ---
  const shaderScenesRef = useRef([null, null, null]);
  const shaderCamerasRef = useRef([null, null, null]);
  const shaderMaterialsRef = useRef([null, null, null]);

  // --- Clock 저장 (NoiseShader용) ---
  const clockRef = useRef(null);

  useEffect(() => {
    if (!containerRef?.current || !canvasRef?.current) return;

    const LINE_RADIUS = 3;
    const UI_CANVAS_SIZE = 256;

    // --- Overlay Canvas 설정 (공용 드로잉 캔버스) ---
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;

    overlayCanvas.width = UI_CANVAS_SIZE;
    overlayCanvas.height = UI_CANVAS_SIZE;
    const overlayContext = overlayCanvas.getContext("2d");
    overlayContext.fillStyle = "#000000";
    overlayContext.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // --- 메인 캔버스 및 렌더러 설정 ---
    const canvas = canvasRef.current;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    
    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    renderer.setSize(Math.floor(width), Math.floor(height));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    rendererRef.current = renderer;

    // --- 공통 Shader 생성 (한 번만) ---
    // Shader 1: NoiseShader
    {
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

      shaderScenesRef.current[0] = noiseScene;
      shaderCamerasRef.current[0] = noiseCamera;
      shaderMaterialsRef.current[0] = {
        material: noiseMaterial,
        mesh: noiseMesh,
      };
    }

    // Shader 2: RampShader
    {
      const rampScene = new THREE.Scene();
      const rampCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const rampMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(RampShader.uniforms),
        vertexShader: RampShader.vertexShader,
        fragmentShader: RampShader.fragmentShader,
      });
      const rampGeometry = new THREE.PlaneGeometry(2, 2);
      const rampMesh = new THREE.Mesh(rampGeometry, rampMaterial);
      rampScene.add(rampMesh);

      shaderScenesRef.current[1] = rampScene;
      shaderCamerasRef.current[1] = rampCamera;
      shaderMaterialsRef.current[1] = {
        material: rampMaterial,
        mesh: rampMesh,
      };
    }

    // Shader 3: CompShader
    {
      const compScene = new THREE.Scene();
      const compCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const compMaterial = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(CompShader.uniforms),
        vertexShader: CompShader.vertexShader,
        fragmentShader: CompShader.fragmentShader,
      });
      const compGeometry = new THREE.PlaneGeometry(2, 2);
      const compMesh = new THREE.Mesh(compGeometry, compMaterial);
      compScene.add(compMesh);

      shaderScenesRef.current[2] = compScene;
      shaderCamerasRef.current[2] = compCamera;
      shaderMaterialsRef.current[2] = {
        material: compMaterial,
        mesh: compMesh,
      };
    }

    // --- RenderTarget 생성 (한 번만) ---
    const noiseRenderTarget = new THREE.WebGLRenderTarget(1024, 1024, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    const rampRenderTarget = new THREE.WebGLRenderTarget(1024, 1024, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
    });

    const compRenderTarget = new THREE.WebGLRenderTarget(1024, 1024, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
    });

    // --- RenderTarget을 직접 저장 (객체 래퍼 제거) ---
    renderTargetsRef.current[0] = noiseRenderTarget;
    renderTargetsRef.current[1] = rampRenderTarget;
    renderTargetsRef.current[2] = compRenderTarget;

    // --- 3개의 viewport 디스플레이 scene/camera 생성 ---
    const viewportWidth = width / 3;
    for (let i = 0; i < 3; i++) {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);

      // viewport 크기에 맞는 orthographic camera
      const camera = new THREE.OrthographicCamera(
        -1, 1, 1, -1, 0.1, 1000
      );
      camera.position.z = 10;

      scenesRef.current[i] = scene;
      camerasRef.current[i] = camera;

      // --- Display Material 생성 (각 viewport마다) ---
      const displayMaterial = new THREE.MeshBasicMaterial({
        map: renderTargetsRef.current[i].texture,
        side: THREE.FrontSide,
      });

      // fullscreen quad (전체 viewport를 채우는 크기)
      const displayGeometry = new THREE.PlaneGeometry(2, 2);
      const displayMesh = new THREE.Mesh(displayGeometry, displayMaterial);
      displayMesh.position.set(0, 0, 0);
      scene.add(displayMesh);

      // --- Materials ref 저장 ---
      if (i === 0) {
        materialsRef.current[i] = { noiseMaterial: shaderMaterialsRef.current[i].material };
      } else if (i === 1) {
        materialsRef.current[i] = { rampMaterial: shaderMaterialsRef.current[i].material };
      } else {
        materialsRef.current[i] = { compMaterial: shaderMaterialsRef.current[i].material };
      }
    }

    // --- 단일 애니메이션 루프 (viewport 분할 렌더링) ---
    clockRef.current = new THREE.Clock();

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const deltaTime = clockRef.current.getDelta();
      const renderer = rendererRef.current;

      if (!renderer) return;

      // --- 1. 각 Shader를 RenderTarget에 렌더링 ---
      
      // Shader 0: NoiseShader
      if (shaderMaterialsRef.current[0]?.material) {
        if (stateRef.current.isDrawing) {
          shaderMaterialsRef.current[0].material.uniforms.uTime.value += deltaTime;
        }
        renderer.setRenderTarget(renderTargetsRef.current[0]);
        renderer.render(shaderScenesRef.current[0], shaderCamerasRef.current[0]);
      }

      // Shader 1: RampShader
      if (shaderMaterialsRef.current[1]?.material) {
        renderer.setRenderTarget(renderTargetsRef.current[1]);
        renderer.render(shaderScenesRef.current[1], shaderCamerasRef.current[1]);
      }

      // Shader 2: CompShader (실제로 texture 0, 1을 사용)
      if (shaderMaterialsRef.current[2]?.material) {
        const compMaterial = shaderMaterialsRef.current[2].material;
        compMaterial.uniforms.tDiffuse1.value = renderTargetsRef.current[0].texture;
        compMaterial.uniforms.tDiffuse2.value = renderTargetsRef.current[1].texture;
        
        renderer.setRenderTarget(renderTargetsRef.current[2]);
        renderer.render(shaderScenesRef.current[2], shaderCamerasRef.current[2]);
      }

      // --- 2. 메인 캔버스에 3개 viewport 렌더링 ---
      renderer.setRenderTarget(null);
      const viewportWidth = width / 3;

      // Clear 전체 canvas
      renderer.clear();

      // Viewport 0: Shader 0 결과
      renderer.setViewport(0, 0, viewportWidth, height);
      renderer.setScissor(0, 0, viewportWidth, height);
      renderer.setScissorTest(true);
      renderer.render(scenesRef.current[0], camerasRef.current[0]);

      // Viewport 1: Shader 1 결과  
      renderer.setViewport(viewportWidth, 0, viewportWidth, height);
      renderer.setScissor(viewportWidth, 0, viewportWidth, height);
      renderer.setScissorTest(true);
      renderer.render(scenesRef.current[1], camerasRef.current[1]);

      // Viewport 2: Shader 2 결과 (합성된 결과)
      renderer.setViewport(viewportWidth * 2, 0, viewportWidth, height);
      renderer.setScissor(viewportWidth * 2, 0, viewportWidth, height);
      renderer.setScissorTest(true);
      renderer.render(scenesRef.current[2], camerasRef.current[2]);
      
      renderer.setScissorTest(false);
    };

    animate();

    // --- 공용 드로잉 이벤트 핸들러 ---
    const handleMouseDown = (event) => {
      const rect = overlayCanvas.getBoundingClientRect();
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

      const rect = overlayCanvas.getBoundingClientRect();
      const scaleX = overlayCanvas.width / rect.width;
      const scaleY = overlayCanvas.height / rect.height;

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

      // --- Shader 파라미터 조절 ---
      if (shaderMaterialsRef.current[0]?.material && Math.abs(dy) > 1) {
        shaderMaterialsRef.current[0].material.uniforms.uContrast.value +=
          dy * 0.01;
        shaderMaterialsRef.current[0].material.uniforms.uContrast.value =
          Math.max(
            0.5,
            Math.min(
              2.0,
              shaderMaterialsRef.current[0].material.uniforms.uContrast.value,
            ),
          );
      }

      if (shaderMaterialsRef.current[1]?.material) {
        shaderMaterialsRef.current[1].material.uniforms.uPhase.value +=
          distance * 0.003;
      }

      // --- 드로잉 ---
      const steps = Math.ceil(distance / (LINE_RADIUS * 0.25));

      overlayContext.shadowBlur = 0;

      for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const interpX = stateRef.current.lastX + dx * t;
        const interpY = stateRef.current.lastY + dy * t;

        const grad = overlayContext.createRadialGradient(
          interpX,
          interpY,
          0,
          interpX,
          interpY,
          LINE_RADIUS,
        );

        grad.addColorStop(0, "rgba(255, 255, 255, 0.2)");
        grad.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");

        overlayContext.fillStyle = grad;
        overlayContext.beginPath();
        overlayContext.arc(interpX, interpY, LINE_RADIUS, 0, Math.PI * 2);
        overlayContext.fill();
      }

      stateRef.current.lastX = x;
      stateRef.current.lastY = y;
    };

    // --- 이벤트 리스너 등록 ---
    overlayCanvas.addEventListener("mousedown", handleMouseDown);
    overlayCanvas.addEventListener("mouseup", handleMouseUp);
    overlayCanvas.addEventListener("mousemove", handleMouseMove);

    handlersRef.current = {
      handleMouseDown,
      handleMouseUp,
      handleMouseMove,
    };

    // --- Cleanup ---
    return () => {
      // Cancel animation
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      // Dispose renderer
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      // Cleanup shader materials
      for (let i = 0; i < 3; i++) {
        if (shaderMaterialsRef.current[i]?.material) {
          shaderMaterialsRef.current[i].material.dispose();
        }
      }

      // Cleanup render targets
      for (let i = 0; i < 3; i++) {
        if (renderTargetsRef.current[i]) {
          renderTargetsRef.current[i].dispose();
        }
      }

      overlayCanvas.removeEventListener(
        "mousedown",
        handlersRef.current.handleMouseDown,
      );
      overlayCanvas.removeEventListener(
        "mouseup",
        handlersRef.current.handleMouseUp,
      );
      overlayCanvas.removeEventListener(
        "mousemove",
        handlersRef.current.handleMouseMove,
      );
    };
  }, []);

  return {
    getRenderer() {
      return rendererRef.current;
    },
    getMaterials() {
      return materialsRef.current;
    },
    getRenderTargets() {
      return renderTargetsRef.current;
    },
    getCanvas() {
      return canvasRef.current;
    },
  };
}

export default useShaderComparison;
