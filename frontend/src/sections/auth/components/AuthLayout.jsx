import React from "react";
import { Link } from "react-router-dom";
import "../auth-global.css";
import "./AuthLayout.css";

/** Centers its children on the gradient background. */
export default function AuthLayout({ children }) {
  return (
    <div className="auth-root auth-layout">
      <header className="site-logo" role="banner">
        <Link to="/" className="site-logo__link" aria-label="home">
          <img src="images/headerLogo.svg" alt="logo" className="site-logo__img" />
        </Link>
      </header>

      {/* keeps pages centered while logo sits at the top */}
      <main className="auth-center d-flex align-items-center justify-content-center">
        {children}
      </main>
    </div>

  );
}
