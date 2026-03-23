import resultPageStyles from '../styles/ResultPage.module.scss'
import { useCallback, useState } from 'react'

function RenderingInputPage({ onSubmit }) {
  const [senderName, setSenderName] = useState('')
  const [isHovered, setIsHovered] = useState(false)

  const handleNameChange = useCallback((e) => {
    setSenderName(e.target.value)
  }, [])

  const handleStartRendering = useCallback(() => {
    // 재생 중인 사운드 종료
    if (window.renderingAudio) {
      window.renderingAudio.pause()
      window.renderingAudio.currentTime = 0
      window.renderingAudio = null
    }
    onSubmit(senderName)
  }, [senderName, onSubmit])

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])

  return (
    <div className={resultPageStyles.main_container} data-name="Twitter post - 9" data-node-id="110:3">
      <div className={resultPageStyles.banner_main_container}>
        <div className={resultPageStyles.banner_container}>
          <div className={resultPageStyles.instruction}>Please write the sender's name.</div>
          <div className={resultPageStyles.input_container}>
            <input
              className={resultPageStyles.input_box}
              value={senderName}
              onChange={handleNameChange}
            />
            <div
              className={`${resultPageStyles.result_btn} ${isHovered ? resultPageStyles.hovered : ''}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={handleStartRendering}
            >
              <>Here's my name</>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RenderingInputPage
