import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  requiredTextToConfirm?: string;
  confirmInputText: string;
  setConfirmInputText: (val: string) => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText,
  cancelText,
  isDanger,
  requiredTextToConfirm,
  confirmInputText,
  setConfirmInputText,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    if (requiredTextToConfirm && inputRef.current) {
      inputRef.current.focus();
    }

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, requiredTextToConfirm]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          aria-describedby="confirm-modal-message"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl relative z-10 space-y-5 text-left border-indigo-500/10"
          >
            <div className="space-y-2">
              <h3 id="confirm-modal-title" className="text-base font-bold text-white flex items-center gap-2 font-sans">
                <AlertTriangle className={`w-5 h-5 ${isDanger ? 'text-rose-500' : 'text-indigo-400'}`} />
                {title}
              </h3>
              <p id="confirm-modal-message" className="text-xs text-slate-400 leading-relaxed whitespace-pre-line font-sans">
                {message}
              </p>
            </div>
            {requiredTextToConfirm && (
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  Accidental Deletion Safeguard: Type "{requiredTextToConfirm}" to confirm:
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  placeholder={`Type ${requiredTextToConfirm}`}
                  aria-label={`Type ${requiredTextToConfirm} to confirm`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 placeholder:text-slate-700 outline-none focus:border-indigo-500 font-sans"
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onCancel}
                aria-label={cancelText || 'Cancel'}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold hover:text-white text-slate-400 transition-all cursor-pointer select-none"
              >
                {cancelText || 'Cancel'}
              </button>
              <button
                onClick={onConfirm}
                aria-label={confirmText || 'Confirm'}
                disabled={requiredTextToConfirm ? confirmInputText !== requiredTextToConfirm : false}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none text-white shadow-lg ${
                  requiredTextToConfirm && confirmInputText !== requiredTextToConfirm
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750'
                    : isDanger 
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/10' 
                    : 'bg-indigo-600 hover:bg-indigo-550 shadow-indigo-900/10'
                }`}
              >
                {confirmText || 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
