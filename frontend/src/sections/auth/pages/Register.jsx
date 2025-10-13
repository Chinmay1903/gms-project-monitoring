import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import AuthCard from "../components/AuthCard";
// import "./Register.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [accept, setAccept]     = useState(false);

  const passwordsMatch = useMemo(
    () => password && password === confirm, [password, confirm]
  );

  const submit = (e) => {
    e.preventDefault();
    if (!passwordsMatch || !accept) return;
    // TODO: integrate register API
    console.log({ username, email, password });
  };

  return (
    <AuthLayout>
      <AuthCard icon={<i className="bi bi-person-plus icon-xl" />}>
        <form onSubmit={submit} noValidate>
          <label className="form-label">Username</label>
          <div className="input-group mb-3">
            <span className="input-group-text"><i className="bi bi-person" /></span>
            <input className="form-control" placeholder="Choose a username"
                   value={username} onChange={(e)=>setUsername(e.target.value)} />
          </div>

          <label className="form-label">Email</label>
          <div className="input-group mb-3">
            <span className="input-group-text"><i className="bi bi-envelope" /></span>
            <input type="email" className="form-control" placeholder="you@example.com"
                   value={email} onChange={(e)=>setEmail(e.target.value)} />
          </div>

          <label className="form-label">Password</label>
          <div className="input-group mb-3">
            <span className="input-group-text"><i className="bi bi-lock" /></span>
            <input type="password" className="form-control" placeholder="Create a password"
                   value={password} onChange={(e)=>setPassword(e.target.value)} />
          </div>

          <label className="form-label">Confirm Password</label>
          <div className="input-group mb-1">
            <span className="input-group-text"><i className="bi bi-lock-fill" /></span>
            <input type="password"
                   className={`form-control ${confirm && !passwordsMatch ? "is-invalid" : ""}`}
                   placeholder="Confirm password"
                   value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
            <div className="invalid-feedback">Passwords do not match.</div>
          </div>

          <div className="form-check mt-2 mb-3">
            <input id="accept" type="checkbox" className="form-check-input"
                   checked={accept} onChange={(e)=>setAccept(e.target.checked)} />
            <label htmlFor="accept" className="form-check-label" style={{color:"var(--text-faint)"}}>
              I accept the Terms & Privacy Policy
            </label>
          </div>

          <button className="btn btn-pink w-100" disabled={!passwordsMatch || !accept}>
            CREATE ACCOUNT
          </button>

          <div className="text-center mt-3">
            <span className="text-white">Already have an account?</span>{" "}
            <Link to="/" className="link-faint">Login</Link>
          </div>
        </form>
      </AuthCard>
    </AuthLayout>
  );
}
