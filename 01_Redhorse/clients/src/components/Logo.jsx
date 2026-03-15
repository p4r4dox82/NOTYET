import React from 'react'
import { useNavigate } from "react-router-dom"
import { getImageURL } from '../utils/utils'

const Logo = React.memo(function Logo({ color }) {
    const navigate = useNavigate()

    const navigateLogo = () => {
        navigate('/')
    }
    return (
        <div className='logo_container_main' onClick={navigateLogo}>
            <div className='logo'>
                {color === 'white' ? (
                    <img alt="logo" src={getImageURL('logo_office_notyet_pure_white.svg')} />
                ) : (
                    <img alt="logo" src={getImageURL('logo_office_notyet.svg')} />
                )}
            </div>
            {/* <div className='logo_background'>
            <img alt="logo" src={getImageURL('logo_background.png')} />
            </div> */}
        </div>
    )
})

export default Logo
