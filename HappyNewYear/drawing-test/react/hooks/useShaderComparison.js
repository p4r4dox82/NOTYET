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
 * 공통 Shader를 생성하고 각 렌더러에서 재사용
 */
export function useShaderComparison(
  containerRefs,
  canvasRefs,
  overlayCanvasRef,
) {
  const renderersRef = useRef([null, null, null]);
  const scenesRef = useRef([null, null, null]);
  const materialsRef = useRef([null, null, null]);
  const renderTargetsRef = useRef([null, null, null]);
  const meshesRef = useRef([null, null, null]);
  const stateRef = useRef({
    isDrawing: false,
    lastX: 0,
    lastY: 0,
  });

  const handlersRef = useRef({});
  const animationIdsRef = useRef([null, null, null]);

  // --- 공통 Shader Scene/Material 저장 ---
  const shaderScenesRef = useRef([null, null, null]);
  const shaderCamerasRef = useRef([null, null, null]);
  const shaderMaterialsRef = useRef([null, null, null]);

  // --- Display관련 저장 ---
  const displayCamerasRef = useRef([null, null, null]);
  const displayMaterialsRef = useRef([null, null, null]);

  // --- Clock 저장 (NoiseShader용) ---
  const clockRef = useRef(null);

  useEffect(() => {
    if (!containerRefs[0]?.current || !canvasRefs[0]?.current) return;

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

    renderTargetsRef.current[0] = { noiseRenderTarget };
    renderTargetsRef.current[1] = { rampRenderTarget };
    renderTargetsRef.current[2] = { compRenderTarget };

    // --- 각 위치별 렌더러 및 디스플레이 초기화 ---
    for (let shaderIndex = 0; shaderIndex < 3; shaderIndex++) {
      const containerRef = containerRefs[shaderIndex];
      const canvasRef = canvasRefs[shaderIndex];

      if (!containerRef.current || !canvasRef.current) continue;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

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
        1000,
      );
      camera.position.z = 10;

      const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
      renderer.setSize(Math.floor(width), Math.floor(height));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;

      renderersRef.current[shaderIndex] = renderer;
      scenesRef.current[shaderIndex] = scene;
      displayCamerasRef.current[shaderIndex] = camera;

      // --- 디스플레이 Material 및 Mesh 생성 ---
      const shaderMaterialData = shaderMaterialsRef.current[shaderIndex];
      const shaderMaterial = shaderMaterialData.material;
      let renderTarget;

      if (shaderIndex === 0) {
        renderTarget = noiseRenderTarget;
        materialsRef.current[shaderIndex] = { noiseMaterial: shaderMaterial };
      } else if (shaderIndex === 1) {
        renderTarget = rampRenderTarget;
        materialsRef.current[shaderIndex] = { rampMaterial: shaderMaterial };
      } else {
        renderTarget = compRenderTarget;
        materialsRef.current[shaderIndex] = { compMaterial: shaderMaterial };
      }

      const displayMaterial = new THREE.MeshBasicMaterial({
        map: renderTarget.texture,
        side: THREE.FrontSide,
      });

      const displayGeometry = new THREE.PlaneGeometry(width, height);
      const displayMesh = new THREE.Mesh(displayGeometry, displayMaterial);
      displayMesh.position.set(0, 0, 0);
      scene.add(displayMesh);

      meshesRef.current[shaderIndex] = { displayMesh };
      displayMaterialsRef.current[shaderIndex] = displayMaterial;
    }

    // --- 단일 애니메이션 루프 (모든 Shader 순서대로 렌더링) ---
    clockRef.current = new THREE.Clock();

    const animate = () => {
      animationIdsRef.current[0] = requestAnimationFrame(animate);
      const deltaTime = clockRef.current.getDelta();

      // --- 1. NoiseShader 렌더링 ---
      if (shaderMaterialsRef.current[0]?.material && renderersRef.current[0]) {
        if (stateRef.current.isDrawing) {
          shaderMaterialsRef.current[0].material.uniforms.uTime.value +=
            deltaTime;
        }
        renderersRef.current[0].setRenderTarget(
          renderTargetsRef.current[0].noiseRenderTarget,
        );
        renderersRef.current[0].render(
          shaderScenesRef.current[0],
          shaderCamerasRef.current[0],
        );
        renderersRef.current[0].setRenderTarget(null);
      }

      // --- 2. RampShader 렌더링 ---
      if (shaderMaterialsRef.current[1]?.material && renderersRef.current[1]) {
        renderersRef.current[1].setRenderTarget(
          renderTargetsRef.current[1].rampRenderTarget,
        );
        renderersRef.current[1].render(
          shaderScenesRef.current[1],
          shaderCamerasRef.current[1],
        );
        renderersRef.current[1].setRenderTarget(null);
      }

      // --- 3. CompShader 렌더링 (다른 두 Shader의 결과를 입력으로 사용) ---
      if (shaderMaterialsRef.current[2]?.material && renderersRef.current[2]) {
        // console.log("ASD");
        // const compMaterial = shaderMaterialsRef.current[2].material;
        // compMaterial.uniforms.tDiffuse1.value = renderTargetsRef.current[0].noiseRenderTarget.texture;
        // compMaterial.uniforms.tDiffuse2.value = renderTargetsRef.current[1].rampRenderTarget.texture;

        // renderersRef.current[2].setRenderTarget(renderTargetsRef.current[2].compRenderTarget);
        // renderersRef.current[2].render(shaderScenesRef.current[2], shaderCamerasRef.current[2]);
        // renderersRef.current[2].setRenderTarget(null);
        renderersRef.current[2].setRenderTarget(
          renderTargetsRef.current[1].rampRenderTarget,
        );
        renderersRef.current[2].render(
          shaderScenesRef.current[1],
          shaderCamerasRef.current[1],
        );
        renderersRef.current[2].setRenderTarget(null);
      }

      // --- 4. 각 위치에서 결과 디스플레이 ---
      for (let i = 0; i < 3; i++) {
        if (
          displayMaterialsRef.current[i] &&
          renderersRef.current[i] &&
          scenesRef.current[i] &&
          displayCamerasRef.current[i]
        ) {
          // console.log(i);
          renderersRef.current[i].render(
            scenesRef.current[i],
            displayCamerasRef.current[i],
          );
        }
      }
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

      // --- Shader 파라미터 조절 (모든 shader) ---
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

      shaderMaterialsRef.current[1].material.uniforms.uPhase.value +=
        distance * 0.003;

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
      if (animationIdsRef.current[0]) {
        cancelAnimationFrame(animationIdsRef.current[0]);
      }

      // Dispose renderers
      for (let i = 0; i < 3; i++) {
        if (renderersRef.current[i]) {
          renderersRef.current[i].dispose();
        }
      }

      // Cleanup 공통 shader materials
      for (let i = 0; i < 3; i++) {
        if (shaderMaterialsRef.current[i]?.material) {
          shaderMaterialsRef.current[i].material.dispose();
        }
        if (displayMaterialsRef.current[i]) {
          displayMaterialsRef.current[i].dispose();
        }
      }

      // Cleanup render targets
      for (let i = 0; i < 3; i++) {
        if (renderTargetsRef.current[i]) {
          const rtData = renderTargetsRef.current[i];
          Object.values(rtData).forEach((rt) => {
            if (rt?.dispose) rt.dispose();
          });
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
    getRenderers() {
      return renderersRef.current;
    },
    getMaterials() {
      return materialsRef.current;
    },
    getRenderTargets() {
      return renderTargetsRef.current;
    },
    getCanvases() {
      return canvasRefs.map((ref) => ref.current);
    },
  };
}

export default useShaderComparison;
