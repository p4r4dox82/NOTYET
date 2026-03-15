import * as THREE from 'three'
import { createNormalMapTexture } from './threeUtils'

/**
 * 시그모이드 함수 (로지스틱 곡선)
 */
function sigmoid(x, k = 10, center = 0.5) {
  // 1. 지정된 center를 기준으로 로지스틱 곡선 계산
  const raw = 1 / (1 + Math.exp(-k * (x - center)))

  // 2. 입력 범위의 양 끝단(0과 1)에서의 시그모이드 값을 구함 (보정용)
  const minSig = 1 / (1 + Math.exp(k * center)) // x = 0 일 때의 값
  const maxSig = 1 / (1 + Math.exp(-k * (1 - center))) // x = 1 일 때의 값

  // 3. [minSig, maxSig] 범위를 [0, 1]로 정규화하여 반환
  // 이를 통해 center가 어디든 관계없이 항상 0에서 시작해 1로 끝납니다.
  return (raw - minSig) / (maxSig - minSig)
}

/**
 * 정규화된 Sqrt 텍스처 생성
 */
function createNormalizedSqrtTexture(sourceCanvas) {
  const width = sourceCanvas.width
  const height = sourceCanvas.height
  const ctx = sourceCanvas.getContext('2d')

  // 1. 원본 데이터 가져오기
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  // --- [1단계] 최솟값(min)과 최댓값(max) 찾기 ---
  let min = 255
  let max = 0

  for (let i = 0; i < data.length; i += 4) {
    const v = data[i] // R 채널 기준 (높이맵 가정)
    if (v < min) min = v
    if (v > max) max = v
  }

  console.log('Min value:', min, 'Max value:', max)

  // 대비 차이가 없는 경우(단색) 처리
  const range = max - min
  if (range === 0) {
    console.warn('Source canvas is a solid color. Normalization skipped.')
    return new THREE.CanvasTexture(sourceCanvas)
  }

  // --- [2단계] 정규화 및 Sqrt 연산 적용 ---
  const resultCanvas = document.createElement('canvas')
  resultCanvas.width = width
  resultCanvas.height = height
  const resCtx = resultCanvas.getContext('2d')
  const resImageData = resCtx.createImageData(width, height)
  const resData = resImageData.data

  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      // (1) 정규화: 현재 값 v를 [0, 1] 범위로 변환
      // 공식: (v - min) / (max - min)
      const normalized = (data[i + j] - min) / range

      // (2) Sqrt 및 반전 연산
      // 공식: 255 * (1.0 - sqrt(normalized))
      const finalValue = 100 * (1.0 - sigmoid(normalized, 10, 0.4))

      resData[i + j] = finalValue
    }
    resData[i + 3] = 255 // Alpha
  }

  resCtx.putImageData(resImageData, 0, 0)
  return new THREE.CanvasTexture(resultCanvas)
}

/**
 * 결과 이미지를 normalMap과 originalMap으로 변환
 * @param {string} resultImage - 이미지 데이터 URL
 * @param {function} setNormalMapTexture - normalMap 상태 설정 함수
 * @param {function} setOriginalMapTexture - originalMap 상태 설정 함수
 */
export async function processImageToNormalMap(resultImage, setNormalMapTexture, setOriginalMapTexture) {
  try {
    const img = new Image()
    img.onload = () => {
      console.log('Image loaded for normal map conversion')
      const CANVAS_WIDTH = 367
      const CANVAS_HEIGHT = 519
      const paddingTop = 83
      const paddingBottom = 50
      const imageHeight = CANVAS_HEIGHT - (paddingTop + paddingBottom)
      const imageWidth = (imageHeight * 337) / 386

      const sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = CANVAS_WIDTH
      sourceCanvas.height = CANVAS_HEIGHT
      const sourceCtx = sourceCanvas.getContext('2d')
      sourceCtx.fillStyle = '#000000'
      sourceCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      sourceCtx.drawImage(
        img,
        (CANVAS_WIDTH - imageWidth) / 2,
        paddingTop,
        imageWidth,
        imageHeight
      )

      // WebGLRenderer 임시 생성 (createNormalMapTexture에서 필요)
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = CANVAS_WIDTH
      tempCanvas.height = CANVAS_HEIGHT
      const renderer = new THREE.WebGLRenderer({ canvas: tempCanvas })

      // 받은 이미지에서 normalMapTexture 생성
      const normalMapCanvas = createNormalMapTexture(
        sourceCanvas,
        renderer,
        CANVAS_WIDTH,
        CANVAS_HEIGHT
      )
      const normalMap = new THREE.CanvasTexture(normalMapCanvas)

      // originalMap 생성
      const originalMap = createNormalizedSqrtTexture(sourceCanvas)
      console.log('Normal map texture created:', normalMap)

      setNormalMapTexture(normalMap)
      setOriginalMapTexture(originalMap)
      renderer.dispose()
    }
    img.onerror = () => console.error('Failed to load resultImage')
    img.src = resultImage
  } catch (error) {
    console.error('Error converting image to normal map:', error)
  }
}
