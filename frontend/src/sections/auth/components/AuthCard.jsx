import React from "react";
import "./AuthCard.css";

/** Glassy card with optional icon area and footer slot. */
export default function AuthCard({ icon, children, footer }) {
  return (
    <div className="auth-card card p-4 shadow-lg">
      {icon && <div className="text-center mb-4 auth-card__icon">{icon}</div>}
      {children}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
