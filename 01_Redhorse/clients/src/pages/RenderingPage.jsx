import resultPageStyles from '../styles/ResultPage.module.scss'
import { useCallback, useState, useEffect } from 'react'
import { addLoadingStatusCallback, removeLoadingStatusCallback, getLoadingStatus } from '../utils/texturePreloader'

function RenderingInputPage({ onSubmit }) {
  const [senderName, setSenderName] = useState('')
  const [isHovered, setIsHovered] = useState(false)
  const [texturesLoading, setTexturesLoading] = useState(() => getLoadingStatus().isLoading)

  useEffect(() => {
    const handleLoadingStatusChange = (status) => {
      setTexturesLoading(status.isLoading)
    }

    addLoadingStatusCallback(handleLoadingStatusChange)
    return () => removeLoadingStatusCallback(handleLoadingStatusChange)
  }, [])

  const handleNameChange = useCallback((e) => {
    // 한글 입력 제거 (영문, 숫자, 특수문자만 허용)
    const value = e.target.value.replace(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g, '')
    setSenderName(value)
  }, [])

  const handleStartRendering = useCallback(() => {
    if (texturesLoading) return

    // 재생 중인 사운드 종료
    if (window.renderingAudio) {
      window.renderingAudio.pause()
      window.renderingAudio.currentTime = 0
      window.renderingAudio = null
    }
    onSubmit(senderName)
  }, [senderName, onSubmit, texturesLoading])

  const handleMouseEnter = useCallback(() => {
    if (!texturesLoading) setIsHovered(true)
  }, [texturesLoading])

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
              className={`${resultPageStyles.result_btn} ${isHovered && texturesLoading ? resultPageStyles.hovered : ''}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={handleStartRendering}
              style={{ cursor: texturesLoading ? 'not-allowed' : 'pointer' }}
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
