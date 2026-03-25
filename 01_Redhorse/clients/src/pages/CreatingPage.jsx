import { ShaderComparison } from '../components/ShaderComparison'
import { getImageURL, initializeCanvas, createDrawingHandlers } from '../utils/utils'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import creatingPageStyles from '../styles/CreatingPage.module.scss'

function CreatingPage({ onBack }) {
  const [isHovered, setIsHovered] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const navigate = useNavigate()
  const drawBoxRef = useRef(null)
  const drawCanvasRef = useRef(null)
  const shaderComparisonRef = useRef(null)
  const stateRef = useRef({
    isDrawing: false,
    lastX: 0,
    lastY: 0,
  })

  // Blur 파라미터 상태
  const [blurParams, setBlurParams] = useState({
    filterSize: { blur4: 32, blur6: 18 },
    uPreShrink: { blur4: 6, blur6: 3 }
  })

  // 이미지 스케일 상태
  const [imageScale, setImageScale] = useState(1)

  useEffect(() => {
    if (!drawBoxRef.current || !drawCanvasRef.current) return

    const canvas = drawCanvasRef.current
    const ctx = initializeCanvas(canvas, drawBoxRef.current)

    const { handleMouseDown, handleMouseUp, handleMouseMove } = createDrawingHandlers(
      canvas,
      ctx,
      stateRef,
      shaderComparisonRef,
      setHasDrawn
    )

    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const navigateMakeButton = async () => {
    let canvasImage = null
    if (shaderComparisonRef.current && shaderComparisonRef.current.getCanvasImage) {
      canvasImage = await shaderComparisonRef.current.getCanvasImage()
    }
    navigate('/result', { state: { resultImage: canvasImage } })
  }

  return (
    <>
    {/* Blur 파라미터 컨트롤 */}
    <div className={creatingPageStyles.blur_controls_fixed}>
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
          Fill Size: {blurParams.filterSize.blur4}
        </label>
        <input
          type="range"
          min="8"
          max="64"
          value={blurParams.filterSize.blur4}
          onChange={(e) => setBlurParams(prev => ({
            ...prev,
            filterSize: { ...prev.filterSize, blur4: Number(e.target.value) }
          }))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
          Fill Shrink: {blurParams.uPreShrink.blur4}
        </label>
        <input
          type="range"
          min="1"
          max="12"
          value={blurParams.uPreShrink.blur4}
          onChange={(e) => setBlurParams(prev => ({
            ...prev,
            uPreShrink: { ...prev.uPreShrink, blur4: Number(e.target.value) }
          }))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
          Line Size: {blurParams.filterSize.blur6}
        </label>
        <input
          type="range"
          min="8"
          max="64"
          value={blurParams.filterSize.blur6}
          onChange={(e) => setBlurParams(prev => ({
            ...prev,
            filterSize: { ...prev.filterSize, blur6: Number(e.target.value) }
          }))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
          Line Shrink: {blurParams.uPreShrink.blur6}
        </label>
        <input
          type="range"
          min="1"
          max="12"
          value={blurParams.uPreShrink.blur6}
          onChange={(e) => setBlurParams(prev => ({
            ...prev,
            uPreShrink: { ...prev.uPreShrink, blur6: Number(e.target.value) }
          }))}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '10px', fontWeight: 'bold' }}>
          Scale: {(imageScale * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={imageScale}
          onChange={(e) => setImageScale(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
    <div className={creatingPageStyles.create_container}>
      <div className={creatingPageStyles.draw_container}>
        <div className={creatingPageStyles.draw_box} ref={drawBoxRef}>
          <canvas
            ref={drawCanvasRef}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              cursor: 'crosshair'
            }}
          />
        </div>
        <div className={`${creatingPageStyles.text} ${hasDrawn ? creatingPageStyles.hidden : ''}`}>
          <div>DRAW YOUR</div>
          <div>WISH HERE</div>
        </div>
      </div>
      <div className={creatingPageStyles.result_container}>
        <div className={creatingPageStyles.result_box} style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '322px', height: '331px', transform: `scale(${imageScale})`, transformOrigin: 'center', transition: 'transform 0.1s' }}>
            <ShaderComparison ref={shaderComparisonRef} defaultMode={7} showButtons={false} blurParams={blurParams} />
          </div>
        </div>
        <div className={creatingPageStyles.text_container}>
          <div className={creatingPageStyles.instruction}>
            We don't store any of your information.
          </div>

          <div
            className={`${creatingPageStyles.make_btn} ${isHovered ? creatingPageStyles.hovered : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={navigateMakeButton}
          >
            <>MADE UP MY WISHES</>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default CreatingPage
