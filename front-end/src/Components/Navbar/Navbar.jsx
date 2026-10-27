import { useState } from "react";
import "./clinika-components.css";
import { Link } from "react-router-dom";

const links = [
    { label: "Home", href: "/" },
    { label: "Doctors", href: "/doctors" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
];

export default function Navbar({ activePath = "/" }) {
    const [open, setOpen] = useState(false);

    return (
        <nav className="navbar navbar-expand-lg cl-navbar">
            <div className="container-fluid px-3 px-lg-5">

                <Link className="cl-logo" to="/">
                    <span className="cl-logo-mark">
                        <i className="fa-solid fa-plus"></i>
                    </span>
                    Clinika
                </Link>


                <button
                    className="navbar-toggler border-0 shadow-none"
                    type="button"
                    aria-controls="clNavMenu"
                    aria-expanded={open}
                    aria-label="Toggle navigation"
                    onClick={() => setOpen((v) => !v)}
                >
                    <i className={`fa-solid ${open ? "fa-xmark" : "fa-bars"}`}></i>
                </button>

                <div
                    className={`collapse navbar-collapse justify-content-lg-end ${open ? "show" : ""}`}
                    id="clNavMenu"
                >

                    <ul className="navbar-nav cl-nav-links mb-2 mb-lg-0">
                        {links.map(({ label, href }) => (
                            <li className="nav-item" key={href}>
                                <Link
                                    className={`nav-link ${activePath === href ? "active" : ""}`}
                                    to={href}
                                    onClick={() => setOpen(false)}
                                >
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    <div className="cl-nav-actions d-flex align-items-center gap-3">
                        <Link className="cl-login-link" to="/login">
                            Login
                        </Link>
                        <Link className="btn cl-btn-book" to="/book">
                            Book Appointment
                        </Link>
                        <Link className="cl-avatar-btn" to="/profile" aria-label="My account">
                            <i className="fa-regular fa-user"></i>
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}