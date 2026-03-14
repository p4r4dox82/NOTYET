import Logo from '../components/Logo'
import { ShaderComparison } from '../components/ShaderComparison'
import { getImageURL, initializeCanvas, createDrawingHandlers } from '../utils/utils'
import '../styles/App.css'
import '../styles/CreatingPage.css'
import '../styles/Components.css'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function CreatingPage() {
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

  // hasDrawn 상태 변경 감시
  useEffect(() => {
    console.log('hasDrawn state changed:', hasDrawn)
  }, [hasDrawn])

  const navigateMakeButton = () => {
    navigate('/rendering')
  }

  // Drawing setup
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

    // Register event listeners
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // Cleanup
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className="main_container" data-name="Twitter post - 9" data-node-id="110:3">
      {/* Background Image */}
      <div className="bg-image" data-name="image 38" data-node-id="129:68">
        <img alt="background" src={getImageURL('main_background.png')} />
      </div>
      {/* Contents */}
        <div className='create_container'>
          <div className='draw_container'>
            <div className='draw_box' ref={drawBoxRef}>
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
            <div className={`text ${hasDrawn ? 'hidden' : ''}`}>
              <div>DRAW YOUR</div>
              <div>WISH HERE</div>
            </div>
          </div>
          <div className='result_container'>
            <div className='result_box'>
              <ShaderComparison ref={shaderComparisonRef} defaultMode={7} showButtons={false} />
            </div>  
            <div className='text_container'>
              <div className='instruction'>
                We don’t store any of your information.
              </div>
              <div className={`make_btn ${isHovered ? 'hovered' : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={navigateMakeButton}>
                <>MADE UP MY WISHES</>
              </div>
            </div>
          </div>
        </div>
      <Logo/> 
    </div>
  )
}

export default CreatingPage
