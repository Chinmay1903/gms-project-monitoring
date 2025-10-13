import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import AuthCard from "../components/AuthCard";
// import "./ForgotPassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    // TODO: integrate API to send reset link
    console.log({ email });
    setSent(true);
  };

  return (
    <AuthLayout>
      <AuthCard icon={<i className="bi bi-shield-lock icon-xl" />}>
        {sent ? (
          <div className="text-center">
            <h5>Password reset link sent</h5>
            <p className="text-faint">
              If an account exists for <b>{email}</b>, you'll receive an email shortly.
            </p>
            <Link to="/" className="btn btn-pink w-100 mt-2">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="form-label">Email</label>
            <div className="input-group mb-3">
              <span className="input-group-text"><i className="bi bi-envelope" /></span>
              <input type="email" className="form-control" placeholder="you@example.com"
                     value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>
            <button className="btn btn-pink w-100">SEND RESET LINK</button>

            <div className="text-center mt-3">
              <Link to="/" className="link-faint">Back to Login</Link>
            </div>
          </form>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
