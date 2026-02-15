import '../styles/RenderingPage.css'
import '../styles/App.css'
import Logo from '../components/Logo'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { getImageURL } from '../utils/utils'

function RenderingPage() {
    const [isHovered, setIsHovered] = useState(false)
    const navigate = useNavigate()

    const navigateMakeButton = () => {
        navigate('/result')
    }
    return (
        <div className="main_container" data-name="Twitter post - 9" data-node-id="110:3">
            {/* Background Image */}            
            <div className='background_image_box'>
                <img alt="background" src={getImageURL('render_background.png')} />
            </div>
            <div className='banner_main_container'>
                <div className='banner_container'>
                    <div className='instruction'>Please write the sender’s name.</div>
                    <div className='input_container'>
                        <input className='input_box'  />
                        <div className={`result_btn ${isHovered ? 'hovered' : ''}`}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            onClick={navigateMakeButton}>
                        <>Here’s my name</>
                        </div>  
                    </div>
                </div>
            </div>
            <Logo color="white"/>
        </div>
    )
}

export default RenderingPage
