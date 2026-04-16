import React, { FC, PropsWithChildren, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

import { Backdrop, Dialog, Header, Title, CloseButton, Body, Footer } from "./Modal.style";

export interface ModalProps {
  isOpen: boolean;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  width?: number;
}

const Modal: FC<PropsWithChildren<ModalProps>> = ({ isOpen, title, footer, onClose, width = 560, children }) => {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <Backdrop onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.14 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <Dialog style={{ width }}>
              {title && (
                <Header>
                  <Title>{title}</Title>
                  <CloseButton type="button" onClick={onClose} aria-label="close">
                    <X size={18} />
                  </CloseButton>
                </Header>
              )}
              <Body>{children}</Body>
              {footer && <Footer>{footer}</Footer>}
            </Dialog>
          </motion.div>
        </Backdrop>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Modal;
