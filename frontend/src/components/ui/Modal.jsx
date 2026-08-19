// components/ui/Modal.jsx
// Hộp thoại popup chứa nội dung bất kỳ
import { X } from 'lucide-react';

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 600 }}>
            {title}
          </h3>
          <button className="btn-icon" onClick={onClose} aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
