/**
 * 이미지 경로를 반환하는 함수
 * 개발 환경에서는 ../public으로 시작, build 환경에서는 /로 시작
 * @param {string} imagePath - 이미지 경로 (예: images/main_image.png)
 * @returns {string} 환경에 맞는 전체 경로
 */
export const getImageURL = (imagePath) => {
  if (import.meta.env.DEV) {
    return `../public/images/${imagePath}`
  }
  return `/images/${imagePath}`
}

/**
 * Canvas 초기화 (크기 설정 및 검정색으로 칠하기)
 * @param {HTMLCanvasElement} canvas - 대상 캔버스
 * @param {HTMLElement} containerBox - 컨테이너 요소
 */
export const initializeCanvas = (canvas, containerBox) => {
  canvas.width = containerBox.clientWidth
  canvas.height = containerBox.clientHeight

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  return ctx
}

/**
 * 마우스 좌표가 캔버스 범위 내인지 확인
 * @param {MouseEvent} event - 마우스 이벤트
 * @param {DOMRect} rect - 캔버스의 getBoundingClientRect() 결과
 * @returns {boolean} 범위 내이면 true
 */
const isMouseInCanvas = (event, rect) => {
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  )
}

/**
 * Canvas에서의 마우스 위치 계산
 * @param {MouseEvent} event - 마우스 이벤트
 * @param {DOMRect} rect - 캔버스의 getBoundingClientRect() 결과
 * @returns {{x: number, y: number}} 캔버스 내 마우스 좌표
 */
const getCanvasMousePosition = (event, rect) => {
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

/**
 * Shader parameters 업데이트 (Noise uTime, Ramp uPhase)
 * @param {Object} shaderComparisonRef - ShaderComparison ref
 * @param {number} dx - 수평 이동거리
 * @param {number} dy - 수직 이동거리
 * @param {number} distance - 전체 이동거리
 */
const updateShaderParameters = (shaderComparisonRef, dx, dy, distance) => {
  if (!shaderComparisonRef.current) return

  shaderComparisonRef.current.updateShaderParameters((materials) => {
    // Noise uTime 조절 (전체 거리 기반)
    if (materials.noise && materials.noise.uniforms.uTime) {
      materials.noise.uniforms.uTime.value += distance * 0.003
    }

    // Ramp uPhase 조절 (수평 이동 기반)
    if (materials.ramp && materials.ramp.uniforms.uPhase) {
      materials.ramp.uniforms.uPhase.value += dx * 0.003
    }
    return;
  })
}

/**
 * 선을 그리는 함수
 * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
 * @param {number} fromX - 시작 X
 * @param {number} fromY - 시작 Y
 * @param {number} toX - 끝 X
 * @param {number} toY - 끝 Y
 * @param {number} lineRadius - 선의 반지름
 */
const drawLine = (ctx, fromX, fromY, toX, toY, lineRadius) => {
  const dx = toX - fromX
  const dy = toY - fromY
  const distance = Math.sqrt(dx * dx + dy * dy)
  const steps = Math.ceil(distance / (lineRadius * 0.25))

  for (let i = 0; i <= steps; i++) {
    const t = steps > 0 ? i / steps : 0
    const interpX = fromX + dx * t
    const interpY = fromY + dy * t

    const grad = ctx.createRadialGradient(interpX, interpY, 0, interpX, interpY, lineRadius)
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)')
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)')
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(interpX, interpY, lineRadius, 0, Math.PI * 2)
    ctx.fill()
  }
}

/**
 * Drawing 이벤트 핸들러 설정
 * @param {HTMLCanvasElement} canvas - 캔버스 요소
 * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
 * @param {Object} stateRef - 상태 ref (isDrawing, lastX, lastY)
 * @param {Object} shaderComparisonRef - ShaderComparison ref
 * @param {Function} onDrawStart - 드로잉 시작시 호출될 콜백
 * @returns {Object} {handleMouseDown, handleMouseUp, handleMouseMove}
 */
export const createDrawingHandlers = (canvas, ctx, stateRef, shaderComparisonRef, onDrawStart) => {
  const LINE_RADIUS = 3

  const handleMouseDown = (event) => {
    const rect = canvas.getBoundingClientRect()
    if (!isMouseInCanvas(event, rect)) return

    stateRef.current.isDrawing = true
    const { x, y } = getCanvasMousePosition(event, rect)
    stateRef.current.lastX = x
    stateRef.current.lastY = y
    
    // 드로잉 시작 콜백 호출
    if (onDrawStart) {
      onDrawStart(true)
    }
  }

  const handleMouseUp = () => {
    stateRef.current.isDrawing = false
  }

  const handleMouseMove = (event) => {
    if (!stateRef.current.isDrawing) return

    const rect = canvas.getBoundingClientRect()
    if (!isMouseInCanvas(event, rect)) return

    const { x, y } = getCanvasMousePosition(event, rect)
    const dx = x - stateRef.current.lastX
    const dy = y - stateRef.current.lastY
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Shader parameters 업데이트
    updateShaderParameters(shaderComparisonRef, dx, dy, distance)

    // 선 그리기
    drawLine(ctx, stateRef.current.lastX, stateRef.current.lastY, x, y, LINE_RADIUS)

    stateRef.current.lastX = x
    stateRef.current.lastY = y
  }

  return { handleMouseDown, handleMouseUp, handleMouseMove }
}
