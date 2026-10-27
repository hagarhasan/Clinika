import Navbar from '../Navbar/Navbar'
import Footer from '../Footer/Footer'
import { Outlet } from 'react-router-dom'

export default function Layout() {
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
