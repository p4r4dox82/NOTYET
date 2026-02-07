import { useNavigate } from "react-router-dom"
import { getImageURL } from '../utils/utils'

function Logo() {
    const navigate = useNavigate()

    const navigateLogo = () => {
        navigate('/')
    }
    return (
        <div className='logo_container' onClick={navigateLogo}>
            <div className='logo'>
            <img alt="logo" src={getImageURL('logo_text.svg')} />
            </div>
            <div className='logo_background'>
            <img alt="logo" src={getImageURL('logo_background.png')} />
            </div>
        </div>
    )
}

export default Logo
