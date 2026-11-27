import Navbar from '../Navbar/Navbar'
import Footer from '../Footer/Footer'
import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { rememberPublicLocation } from '../../utils/logoutNavigation'

export default function Layout() {
    const location = useLocation()
    const { pathname, search, hash } = location

    useEffect(() => {
        rememberPublicLocation({ pathname, search, hash })
    }, [pathname, search, hash])

    return (
        <div className="cl-app-layout">
            <Navbar />
            <main className="cl-main-content">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}
