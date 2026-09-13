import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Trash2, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Custom Confirmation & Alert Dialog Modal
 * Replaces native browser alert() & confirm() dialogs with elegant UI.
 * Uses createPortal to mount directly to document.body for dead-center positioning.
 * 
 * @param {object} props
 * @param {object|null} props.config
 * @param {boolean} props.config.visible
 * @param {string} props.config.title
 * @param {string} props.config.message
 * @param {'success' | 'confirm_delete' | 'warning' | 'error' | 'info'} props.config.type
 * @param {string} [props.config.confirmText]
 * @param {string} [props.config.cancelText]
 * @param {function} props.config.onConfirm
 * @param {function} [props.config.onCancel]
 * @param {function} props.onClose
 */
export default function AlertModal({ config, onClose }) {
  if (!config || !config.visible) return null;

  const {
    title,
    message,
    type = 'info',
    confirmText,
    cancelText = 'Batal',
    onConfirm,
    onCancel,
  } = config;

  // Handle ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        else if (onConfirm) onConfirm();
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onConfirm, onClose]);

  const handleConfirmClick = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const handleCancelClick = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="dialog-icon-circle success">
            <Check size={34} strokeWidth={2.5} />
          </div>
        );
      case 'confirm_delete':
        return (
          <div className="dialog-icon-circle danger">
            <Trash2 size={34} strokeWidth={2.2} />
          </div>
        );
      case 'error':
        return (
          <div className="dialog-icon-circle danger">
            <X size={34} strokeWidth={2.5} />
          </div>
        );
      case 'warning':
        return (
          <div className="dialog-icon-circle warning">
            <AlertTriangle size={34} strokeWidth={2.2} />
          </div>
        );
      default:
        return (
          <div className="dialog-icon-circle info">
            <Info size={34} strokeWidth={2.2} />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    if (type === 'confirm_delete' || type === 'error') {
      return 'dialog-btn-confirm-danger';
    }
    if (type === 'success') {
      return 'dialog-btn-confirm-success';
    }
    return 'dialog-btn-confirm-primary';
  };

  const defaultConfirmText = () => {
    if (confirmText) return confirmText;
    if (type === 'confirm_delete') return 'Hapus';
    if (type === 'success') return 'Selesai';
    return 'Mengerti';
  };

  return createPortal(
    <div className="dialog-overlay" onClick={onCancel ? handleCancelClick : handleConfirmClick}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        {renderIcon()}

        <h3 className="dialog-title">{title}</h3>
        <p className="dialog-message">{message}</p>

        <div className="dialog-buttons">
          {onCancel && (
            <button
              type="button"
              className="dialog-btn dialog-btn-cancel"
              onClick={handleCancelClick}
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            className={`dialog-btn ${getConfirmButtonClass()}`}
            onClick={handleConfirmClick}
            autoFocus
          >
            {type === 'confirm_delete' && <Trash2 size={18} />}
            {type === 'success' && <Check size={18} />}
            <span>{defaultConfirmText()}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
