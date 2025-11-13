import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ErrorModal from "../sections/features/components/ErrorModal";
import {
  clearToken,
  touchActivity,
  isIdle,
  isAuthenticated,
} from "../api/authSession"; // adjust path if yours differs

const IDLE_MS = 2 * 60 * 1000; // 2 minutes
const AUTH_EVENT = "auth:changed";

export default function IdleSession() {
  const navigate = useNavigate();
  const location = useLocation();

  const [authed, setAuthed] = useState(isAuthenticated());
  const [expired, setExpired] = useState(false);

  const ticker = useRef(null);
  const detachActivityRef = useRef(() => {});

  const stopTicker = () => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  };

  const startTicker = () => {
    stopTicker();
    ticker.current = setInterval(() => {
      // if we lost auth mid-cycle, stop everything
      if (!isAuthenticated()) {
        setAuthed(false);
        setExpired(false);
        stopTicker();
        return;
      }
      if (isIdle(IDLE_MS)) {
        stopTicker();
        setExpired(true);
      }
    }, 1000);
  };

  const attachActivityListeners = () => {
    const bump = () => touchActivity();
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    bump(); // seed lastActiveAt now
    detachActivityRef.current = () =>
      events.forEach((e) => window.removeEventListener(e, bump));
  };

  const detachActivityListeners = () => {
    detachActivityRef.current?.();
    detachActivityRef.current = () => {};
  };

  // cross-tab auth sync
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "authToken") setAuthed(!!e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // same-tab auth sync (from saveToken/clearToken)
  useEffect(() => {
    const h = () => setAuthed(isAuthenticated());
    window.addEventListener(AUTH_EVENT, h);
    return () => window.removeEventListener(AUTH_EVENT, h);
  }, []);

  // arm/disarm watcher based on auth state
  useEffect(() => {
    if (authed) {
      setExpired(false);
      attachActivityListeners();
      startTicker();
    } else {
      setExpired(false);
      stopTicker();
      detachActivityListeners();
    }
    return () => {
      stopTicker();
      detachActivityListeners();
    };
  }, [authed]);

  const handleClose = () => {
    setExpired(false);
    clearToken();   // triggers AUTH_EVENT; authed -> false
    if (location.pathname !== "/") {
      navigate("/", { replace: true, state: { from: location } });
    }
  };

  if (!authed || !expired) return null;

  return (
    <ErrorModal
      show
      title="Session expired"
      message="You were inactive for 2 minutes. Please sign in again."
      onHide={handleClose}
      onClose={handleClose}
      size="sm"
    />
  );
}
