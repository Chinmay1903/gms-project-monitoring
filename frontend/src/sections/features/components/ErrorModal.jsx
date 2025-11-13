import React from "react";

/**
 * ErrorModal
 * - Blocking error popup with animated ❌
 * - Does NOT auto-close
 * - Shows a Close button
 * - Optional redirect handler on close (controlled by parent)
 *
 * Props:
 *  - show: boolean
 *  - title?: string (default "Error")
 *  - message: string or ReactNode
 *  - onHide: () => void (parent can redirect/reload after close)
 *  - size?: "sm" | "md" | "lg" | "xl" (default "md")
 */
export default function ErrorModal({ show, title = "Error", message, onHide, size = "md" }) {
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
          <div className="modal-content modal-anim-pop">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onHide} />
            </div>

            <div className="modal-body text-center">
              <div className="status-icon-wrap mb-2">
                <div className="status-icon status-icon-error" aria-hidden="true">❌</div>
              </div>
              <div className="fs-6">{message}</div>
            </div>

            <div className="modal-footer justify-content-center">
              <button type="button" className="btn btn-outline-danger px-4" onClick={onHide}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Backdrop on top to “blur” what’s behind */}
      <div className="modal-backdrop fade show"></div>

      {/* Minimal animations (scoped) */}
      <style>{`
        .modal-anim-pop {
          animation: modalPop 200ms ease-out;
        }
        @keyframes modalPop {
          0% { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .status-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .status-icon {
          font-size: 48px;
          line-height: 1;
          display: inline-block;
        }
        .status-icon-error {
          animation: errorPulse 650ms ease-out both;
        }
        @keyframes errorPulse {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}
