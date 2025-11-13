import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./sections/auth/pages/Login";
import Register from "./sections/auth/pages/Register";
import ForgotPassword from "./sections/auth/pages/ForgotPassword";
import Dashboard from "./sections/features/pages/Dashboard";
import ProjectList from "./sections/features/pages/ProjectList";
import ResourceList from "./sections/features/pages/ResourceList";
import TaskMonitoring from "./sections/features/pages/TaskMonitoring";

import RequireAuth from "./api/RequireAuth";
import IdleSession from "./api/IdleSession";
import ErrorModal from "./sections/features/components/ErrorModal";
import { isAuthenticated } from "./api/authSession";

function NotFoundRedirect() {
  return (
    <ErrorModal
      show
      title="Not Found"
      message="The page you’re looking for doesn’t exist. Redirecting to Login…"
      onHide={() => {}}
      size="sm"
    />
  );
}

export default function App() {
  return (
    <>
      <IdleSession />
      <Routes>
        {/* Auth */}
        <Route
          path="/"
          element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />

        {/* Protected */}
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/projects"  element={<RequireAuth><ProjectList /></RequireAuth>} />
        <Route path="/resources" element={<RequireAuth><ResourceList /></RequireAuth>} />
        <Route path="/tasks"     element={<RequireAuth><TaskMonitoring /></RequireAuth>} />

        {/* 404 */}
        <Route path="*" element={<NotFoundRedirect />} />
      </Routes>
    </>
  );
}
