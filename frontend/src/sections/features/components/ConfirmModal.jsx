import React, { useEffect } from "react";

/**
 * ConfirmModal
 * - Adds body class "confirm-open" while visible (enables blur via CSS)
 * - Uses elevated z-index + darker backdrop classes to highlight itself
 * - Keeps Bootstrap-compatible markup so it stacks cleanly over another modal
 */
export default function ConfirmModal({
  show,
  title = "Confirm",
  children,
  confirmText = "Confirm",
  confirmVariant = "primary",
  onConfirm,
  onClose,
  size = "lg",
  disableConfirm = false,
}) {
  // Toggle body class to activate the blur styles from ProjectList.css
  useEffect(() => {
    if (show) document.body.classList.add("confirm-open");
    return () => {
      document.body.classList.remove("confirm-open");
    };
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div
        className="modal fade show d-block confirm-modal modal-anim-pop"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
      >
        <div className={`modal-dialog modal-${size} modal-dialog-centered ring-2`} role="document">
          <div className="modal-content shadow-lg">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>

            <div className="modal-body">
              {children}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn btn-${confirmVariant}`}
                onClick={onConfirm}
                disabled={disableConfirm}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Elevated darker backdrop to highlight confirm modal */}
      <div className="modal-backdrop fade show confirm-backdrop" />
    </>
  );
}
