import { Routes, Route, Link, Navigate } from "react-router-dom";
import Login from "./sections/auth/pages/Login";
import Register from "./sections/auth/pages/Register";
import ForgotPassword from "./sections/auth/pages/ForgotPassword";
import Dashboard from "./sections/features/pages/Dashboard";
import ProjectList from "./sections/features/pages/ProjectList";
import ResourceList from "./sections/features/pages/ResourceList";
import TaskMonitoring from "./sections/features/pages/TaskMonitoring";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/resources" element={<ResourceList />} />
        <Route path="/tasks" element={<TaskMonitoring />} />
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        {/* Redirect /dashboard to / */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={
          <div className="text-center text-white">
            <h4>Not Found</h4>
            <Link to="/" className="btn btn-light mt-3">Go to Login</Link>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;
