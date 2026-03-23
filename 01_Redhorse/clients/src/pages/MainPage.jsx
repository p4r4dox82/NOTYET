import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImageURL } from '../utils/utils'
import { preloadTextures } from '../utils/texturePreloader'
import '../styles/App.css'
import mainPageStyles from '../styles/MainPage.module.scss'
import Logo from '../components/Logo'

function MainPage() {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    preloadTextures()
  }, [])

  const handleCreateCard = () => {
    navigate('/create')
  }

  return (
    <div className="main_container" data-name="Twitter post - 10" data-node-id="110:22">
      {/* Background Image */}
      <div className="bg-image" data-name="image 38" data-node-id="129:45">
        <img alt="background" src={getImageURL('main_background.png')} />
      </div>

      {/* Start Banner */}
      <div className={mainPageStyles.start_banner_container} data-node-id="110:37">
        <div className={mainPageStyles.logo_container}>
          <img alt="logo" src={getImageURL('logo_office_notyet_white.svg')} />
        </div>
        <div className={mainPageStyles.text_container}>
          <div className={mainPageStyles.main_text}>Make own happy new year invitation</div>
          <div className={mainPageStyles.sub_text_container}>
            <div className={mainPageStyles.production}>by. office notyet</div>
            <div className={mainPageStyles.instruction_container}>
              <div className={mainPageStyles.instruction}>
                <div>No spam. Just New</div>
                <div>Year greetings. </div>
              </div>
              <div
                className={`${mainPageStyles['create-card-btn']} ${isHovered ? mainPageStyles.hovered : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleCreateCard}
              >
                <>CREATE A CARD</>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Logo/>
    </div>
  )
}

export default MainPage
