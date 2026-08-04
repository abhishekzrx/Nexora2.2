/**
 * AdminModal
 * Reusable modal shell matching admin.html modal design.
 * All icons go through the global AppIcon system.
 */
import AppIcon from '../ui/AppIcon'
import Button from '../ui/Button'

function AdminModal({ title, open, onClose, children, footer }) {
  if (!open) return null

  return (
    <div
      className="admin-modal active"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="admin-modal-content">
        <div className="admin-modal-header">
          {title}
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            <AppIcon name="close" size={18} />
          </button>
        </div>
        {children}
        {footer ? <div className="admin-modal-footer">{footer}</div> : null}
      </div>
    </div>
  )
}

export function AdminFormField({ label, required = false, children, htmlFor }) {
  return (
    <div className="admin-form-group">
      <label className="admin-form-label" htmlFor={htmlFor}>
        {label}
        {required ? ' *' : null}
      </label>
      {children}
    </div>
  )
}

export function AdminModalFooter({
  cancelLabel = 'Cancel',
  submitLabel,
  submitVariant = 'primary',
  onCancel,
  onSubmit,
  submitType = 'submit',
}) {
  return (
    <div className="admin-modal-footer">
      <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
      <Button type={submitType} variant={submitVariant} onClick={onSubmit}>{submitLabel}</Button>
    </div>
  )
}

export default AdminModal