import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "./authSession";

export default function RequireAuth({ children }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return children;
}
