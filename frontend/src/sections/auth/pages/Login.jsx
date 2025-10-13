import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import AuthCard from "../components/AuthCard";
import { loginApi } from "../../../api/auth";

const DOMAIN = "@giantmindsolutions.com";

// Ensure the email always ends with @giantminds.com
function normalizeEmail(input) {
  if (!input) return "";
  // remove any existing domain part and append required domain
  const prefix = input.split("@")[0];
  return prefix ? `${prefix}${DOMAIN}` : "";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState(""); // <-- show server message
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const redirectTimer = useRef(null);

  const handleEmailChange = (e) => {
    const raw = e.target.value;
    // On ANY change, enforce postfix in the field itself
    const normalized = normalizeEmail(raw);
    setEmail(normalized);
    // live validation reset for email
    if (fieldErrors.email) setFieldErrors((fe) => ({ ...fe, email: "" }));
  };

  const validate = () => {
    const errs = { email: "", password: "" };

    const prefix = email.split("@")[0];
    if (!prefix || prefix.trim().length === 0) {
      errs.email = "Email prefix is required.";
    } else if (prefix.trim().length < 3) {
      errs.email = "Email prefix must be at least 3 characters.";
    }
    if (!email.endsWith(DOMAIN)) {
      errs.email = `Email must end with ${DOMAIN}`;
    }

    if (!password) errs.password = "Password is required.";
    else if (password.length < 6) errs.password = "Password must be at least 6 characters.";

    setFieldErrors(errs);
    return !errs.email && !errs.password;
  };

  const submit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    // make sure the field is normalized before sending
    const finalEmail = normalizeEmail(email);

    setEmail(finalEmail); // reflect any last-second normalization back to UI

    if (!validate()) return;

    setLoading(true);
    try {
      const { ok, message } = await loginApi({ username: finalEmail, password });

      if (ok) {
        // Show message immediately after button click
        setSuccessMsg(message || "Login successful");

        // Optional preference store
        try {
          (remember ? localStorage : sessionStorage).setItem("rememberUser", finalEmail);
        } catch {}

        // Redirect shortly after showing the message (adjust delay as you like)
        redirectTimer.current = setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 900);
        return;
      }

      setFormError(message || "Login failed.");
    } catch (err) {
      setFormError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  // cleanup the timer if component unmounts
  React.useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
  }, []);

  return (
    <AuthLayout>
      <AuthCard icon={<i className="bi bi-person-circle icon-xl" />}>
        <form onSubmit={submit} noValidate>
          <label className="form-label">Email</label>
          <div className="input-group mb-1">
            <span className="input-group-text">
              <i className="bi bi-envelope" />
            </span>
            <input
              className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
              placeholder={`your.name${DOMAIN}`}
              value={email}
              onChange={handleEmailChange}     // <-- postfix applied on any change
              onBlur={() => setEmail(normalizeEmail(email))}
              autoComplete="username"
              required
            />
          </div>
          {fieldErrors.email && (
            <div className="invalid-feedback d-block mb-2">{fieldErrors.email}</div>
          )}

          <label className="form-label">Password</label>
          <div className="input-group mb-1">
            <span className="input-group-text">
              <i className="bi bi-lock" />
            </span>
            <input
              type="password"
              className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
              placeholder="Enter password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((fe) => ({ ...fe, password: "" }));
              }}
              onBlur={validate}
              autoComplete="current-password"
              required
            />
          </div>
          {fieldErrors.password && (
            <div className="invalid-feedback d-block mb-2">{fieldErrors.password}</div>
          )}

          {formError && <div className="text-danger small mb-2">{formError}</div>}
          {successMsg && <div className="text-success small mb-2">{successMsg}</div>}

          <button className="btn btn-pink w-100 mt-1" disabled={loading}>
            {loading ? "Signing in..." : "LOGIN"}
          </button>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="form-check mb-0">
              <input
                id="remember"
                type="checkbox"
                className="form-check-input"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label htmlFor="remember" className="form-check-label" style={{ color: "var(--text-faint)" }}>
                Remember me
              </label>
            </div>
            <Link to="/forgot" className="link-faint">
              Forgot your password?
            </Link>
          </div>

          <div className="text-center mt-3">
            <span className="text-white">No account?</span>{" "}
            <Link to="/register" className="link-faint">
              Register
            </Link>
          </div>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
