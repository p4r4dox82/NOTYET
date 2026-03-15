import '../styles/RenderingPage.css'
import '../styles/App.css'
import Logo from '../components/Logo'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { getImageURL } from '../utils/utils'

function RenderingPage() {
    const [isHovered, setIsHovered] = useState(false)
    const [senderName, setSenderName] = useState('')
    const navigate = useNavigate()
    const location = useLocation()
    const resultImage = location.state?.resultImage

    const handleNameChange = useCallback((e) => {
        setSenderName(e.target.value)
    }, [])

    const navigateMakeButton = useCallback(() => {
        navigate('/result', { state: { resultImage, senderName } })
    }, [resultImage, senderName, navigate])

    const handleMouseEnter = useCallback(() => setIsHovered(true), [])
    const handleMouseLeave = useCallback(() => setIsHovered(false), [])
    return (
        <div className="main_container" data-name="Twitter post - 9" data-node-id="110:3">
            <div className='banner_main_container'>
                <div className='banner_container'>
                    <div className='instruction'>Please write the sender’s name.</div>
                    <div className='input_container'>
                        <input 
                            className='input_box'
                            value={senderName}
                            onChange={handleNameChange}
                        />
                        <div className={`result_btn ${isHovered ? 'hovered' : ''}`}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
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
