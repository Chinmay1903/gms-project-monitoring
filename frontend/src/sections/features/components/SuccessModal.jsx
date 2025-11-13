import React, { useEffect } from "react";

/**
 * SuccessModal
 * - Animated checkmark ✔️
 * - Auto-close optional (default true)
 * - Blocks page behind with backdrop
 */
export default function SuccessModal({
  show,
  message = "Success",
  onHide,
  autoClose = true,
  autoCloseMs = 1400,
  size = "md",
}) {
  useEffect(() => {
    if (!show || !autoClose) return;
    const t = setTimeout(() => onHide?.(), autoCloseMs);
    return () => clearTimeout(t);
  }, [show, autoClose, autoCloseMs, onHide]);

  if (!show) return null;

  const dialogSize =
    size === "sm" ? "modal-sm"
      : size === "lg" ? "modal-lg"
      : size === "xl" ? "modal-xl"
      : "";

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" aria-modal="true" role="dialog">
        <div className={`modal-dialog modal-dialog-centered ${dialogSize}`}>
          <div className="modal-content text-center modal-anim-pop">
            <div className="modal-body py-4">
              <div className="success-check-wrap mb-3" aria-hidden="true">
                {/* animated circle + tick */}
                <svg className="success-check" viewBox="0 0 120 120" width="96" height="96">
                  <circle className="success-circle" cx="60" cy="60" r="52" fill="none" strokeWidth="8" />
                  <polyline className="success-tick" points="35,64 52,79 86,45" fill="none" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="fs-6 fw-semibold">{message}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />

      {/* scoped animation styles */}
      <style>{`
        .modal-anim-pop { animation: smPop 220ms ease-out; }
        @keyframes smPop { from{transform:scale(.9);opacity:0} to{transform:scale(1);opacity:1} }

        .success-check { display:inline-block; }
        .success-circle { stroke: #22c55e; opacity:.15; }
        .success-tick { stroke:#22c55e; stroke-dasharray: 120; stroke-dashoffset: 120; animation: tick 700ms ease-out forwards 120ms; }
        @keyframes tick { to { stroke-dashoffset: 0; } }
      `}</style>
    </>
  );
}
