import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import FullscreenLoader from '@/components/ui/FullscreenLoader';
import AlertModal from '@/components/ui/AlertModal';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  // Loading State
  const [loadingState, setLoadingState] = useState({
    visible: false,
    message: 'Memproses data...',
  });

  // Alert / Confirm Modal State
  const [alertConfig, setAlertConfig] = useState(null);
  const promiseResolverRef = useRef(null);

  const showLoading = useCallback((message = 'Memproses data...') => {
    setLoadingState({ visible: true, message });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState((prev) => ({ ...prev, visible: false }));
  }, []);

  /**
   * Shows a custom Alert modal. Can be awaited with async/await or use onConfirm callback.
   * 
   * @param {object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {'success' | 'error' | 'warning' | 'info'} [options.type='info']
   * @param {string} [options.confirmText]
   * @param {function} [options.onConfirm]
   * @returns {Promise<boolean>}
   */
  const showAlert = useCallback(({
    title = 'Informasi',
    message = '',
    type = 'info',
    confirmText,
    onConfirm,
  } = {}) => {
    return new Promise((resolve) => {
      promiseResolverRef.current = resolve;
      setAlertConfig({
        visible: true,
        title,
        message,
        type,
        confirmText,
        onConfirm: () => {
          if (onConfirm) onConfirm();
          resolve(true);
        },
      });
    });
  }, []);

  /**
   * Shows a custom Confirmation modal with Batal and Confirm buttons.
   * Can be awaited with async/await (returns true if confirmed, false if cancelled).
   * 
   * @param {object} options
   * @param {string} options.title
   * @param {string} options.message
   * @param {'confirm_delete' | 'warning' | 'info' | 'success'} [options.type='confirm_delete']
   * @param {string} [options.confirmText]
   * @param {string} [options.cancelText='Batal']
   * @param {function} [options.onConfirm]
   * @param {function} [options.onCancel]
   * @returns {Promise<boolean>}
   */
  const showConfirm = useCallback(({
    title = 'Konfirmasi Tindakan',
    message = 'Apakah Anda yakin ingin melanjutkan?',
    type = 'confirm_delete',
    confirmText,
    cancelText = 'Batal',
    onConfirm,
    onCancel,
  } = {}) => {
    return new Promise((resolve) => {
      promiseResolverRef.current = resolve;
      setAlertConfig({
        visible: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        onConfirm: () => {
          if (onConfirm) onConfirm();
          resolve(true);
        },
        onCancel: () => {
          if (onCancel) onCancel();
          resolve(false);
        },
      });
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertConfig(null);
    if (promiseResolverRef.current) {
      promiseResolverRef.current(false);
      promiseResolverRef.current = null;
    }
  }, []);

  return (
    <DialogContext.Provider
      value={{
        showLoading,
        hideLoading,
        showAlert,
        showConfirm,
      }}
    >
      {children}

      {/* Global Fullscreen Cube Loader */}
      <FullscreenLoader
        visible={loadingState.visible}
        message={loadingState.message}
      />

      {/* Global Custom Alert & Confirm Modal */}
      <AlertModal
        config={alertConfig}
        onClose={closeAlert}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
