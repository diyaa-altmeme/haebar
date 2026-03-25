/**
 * Reusable Modal component — fully accessible, RTL-safe
 * Usage:
 *   <Modal isOpen={bool} onClose={fn} title="..." size="sm|md|lg|xl">
 *     {children}
 *   </Modal>
 */
export default function Modal({ isOpen, onClose, title, children, size = "md", footer }) {
  if (!isOpen) return null;

  const sizeMap = {
    sm: "520px",
    md: "680px",
    lg: "860px",
    xl: "1080px",
    full: "95vw",
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="modal"
        style={{ maxWidth: sizeMap[size] || sizeMap.md }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="إغلاق">✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
