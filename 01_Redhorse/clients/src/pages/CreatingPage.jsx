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
        <div className={creatingPageStyles.result_box}>
          <ShaderComparison ref={shaderComparisonRef} defaultMode={7} showButtons={false} />
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
  )
}

export default CreatingPage
