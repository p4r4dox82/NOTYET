import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getImageURL } from '../utils/utils'
import '../styles/App.css'
import '../styles/MainPage.css'
import Logo from '../components/Logo'

function MainPage() {
  const [isHovered, setIsHovered] = useState(false)
  const navigate = useNavigate()

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
      <div className="start_banner_container" data-node-id="110:37">
        <div className='logo_container'>
          <img alt="logo" src={getImageURL('logo_office_notyet_white.svg')} />
        </div>
        <div className='text_container'>
          <div className='main_text'>Make own happy new year invitation</div>
          <div className='sub_text_container'>
            <div className='production'>by. office notyet</div>
            <div className='instruction_container'>
              <div className='instruction'>
                <div>No spam. Just New</div>
                <div>Year greetings. </div>
              </div>
              <div
                className={`create-card-btn ${isHovered ? 'hovered' : ''}`}
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
