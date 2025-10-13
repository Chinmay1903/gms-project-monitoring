import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate  } from "react-router-dom";
import "./AppHeader.css";

const ROUTE_TITLES = {
    "/dashboard": "Dashboard",
    "/projects": "Project Listing",
    "/resources": "Resource Details",
    "/tasks": "Task Monitoring",
};

export default function AppHeader({
    logoSrc = "images/headerLogo.svg",
}) {
    const navigate = useNavigate();
    const location = useLocation();
    const routeTitle = ROUTE_TITLES[location.pathname] || "";

    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    const toggleMenu = () => setOpen((v) => !v);
    const closeMenu = () => setOpen(false);

    // close on outside click
    useEffect(() => {
        const onDocClick = (e) => {
            if (!wrapRef.current) return;
            if (!wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    // close on route change
    useEffect(() => { setOpen(false); }, [location.pathname]);

    // ESC to close
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);

    const handleLogout = () => {
        // clear any auth state if you store it
        // localStorage.removeItem("token");
        navigate("/", { replace: true }); // adjust if your login route is different
    };

    return (
        <header className="app-header-root pm-appbar d-flex align-items-center justify-content-between mb-2">
            <div className="pm-brand">
                <img src={logoSrc} alt="logo" className="pm-logo" />
                {routeTitle && <span className="route-name">Project Monitor</span>}
            </div>

            <ul className="nav pm-tabs">
                <li className="nav-item">
                    <NavLink end to="/dashboard" className={"nav-link" + (location.pathname === "/dashboard" ? " active" : "")}>
                        <i className="bi bi-speedometer2"></i>
                        <span>Dashboard</span>
                    </NavLink>
                </li>
                <li className="nav-item">
                    <NavLink to="/projects" className={"nav-link" + (location.pathname === "/projects" ? " active" : "")}>
                        <i className="bi bi-list-task"></i>
                        <span>Project Listing</span>
                    </NavLink>
                </li>
                <li className="nav-item">
                    <NavLink to="/resources" className={"nav-link" + (location.pathname === "/resources" ? " active" : "")}>
                        <i className="bi bi-people"></i>
                        <span>Resource Details</span>
                    </NavLink>
                </li>
                <li className="nav-item">
                    <NavLink to="/tasks" className={"nav-link" + (location.pathname === "/tasks" ? " active" : "")}>
                        <i className="bi bi-clipboard-check"></i>
                        <span>Task Monitoring</span>
                    </NavLink>
                </li>
            </ul>

            {/* Admin chip (right) + dropdown */}
            <div className="pm-admin-wrap" ref={wrapRef}>
                <button
                    className="pm-admin btn btn-sm"
                    onClick={toggleMenu}
                    aria-haspopup="menu"
                    aria-expanded={open ? "true" : "false"}
                >
                    <i className="bi bi-person-circle me-1"></i> Admin
                    <i className="bi bi-caret-down ms-1 small"></i>
                </button>

                <div className={`pm-admin-menu ${open ? "show" : ""}`} role="menu">
                    {/* <button className="pm-menu-item" type="button" onClick={closeMenu}>
                        <i className="bi bi-person me-2"></i> Profile
                    </button>
                    <button className="pm-menu-item" type="button" onClick={closeMenu}>
                        <i className="bi bi-gear me-2"></i> Settings
                    </button>
                    <div className="pm-menu-divider" /> */}
                    <button className="pm-menu-item text-danger" type="button" onClick={handleLogout}>
                        <i className="bi bi-box-arrow-right me-2"></i> Logout
                    </button>
                </div>
            </div>
        </header>
    );
}
