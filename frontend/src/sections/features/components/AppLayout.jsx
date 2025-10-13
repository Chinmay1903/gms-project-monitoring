import React from "react";
import AppHeader from "./AppHeader";
import "./AppLayout.css";
import "../dashboard-global.css";

export default function AppLayout({
  children,
  footerText = `© ${new Date().getFullYear()} · Project Monitoring ~ Giantmind Solutions Pvt Ltd`,
}) {
  return (
    <div className="dashboard-root">
      <div className="container-fluid px-0 app-shell">
        <AppHeader />
        <main className="app-main">{children}</main>
        <footer className="text-center py-2 app-footer">
          {footerText}
        </footer>
      </div>
    </div>
  );
}
