import { X } from 'lucide-react';

/**
 * Reusable modal shell — replaces the `fixed inset-0 bg-black/50 ...`
 * backdrop-plus-centered-card markup that every admin/vendor CRUD page
 * (Hotels.jsx, Activities.jsx, etc.) previously hand-rolled per file.
 *
 *   <Modal open={editModal} onClose={closeEditModal} title="Edit Hotel" size="lg">
 *     <form>...</form>
 *   </Modal>
 */
const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const Modal = ({ open, onClose, title, size = 'md', children, footer }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative bg-white rounded-2xl shadow-card-hover w-full ${SIZES[size] || SIZES.md} max-h-[90vh] overflow-y-auto`}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 sticky top-0 bg-white rounded-t-2xl">
            <h3 className="font-display text-lg font-semibold text-neutral-900">{title}</h3>
            <button onClick={onClose} aria-label="Close" className="text-neutral-400 hover:text-neutral-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-neutral-100">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
