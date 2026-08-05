/**
 * AdminShared
 * Small reusable building blocks for the Admin module.
 * All icons go through the global AppIcon system.
 */
import AppIcon from '../ui/AppIcon'

/**
 * AdminBadge — visual twin of the badge in admin.html
 * (radius 6px, 11px font, success/warning variants)
 */
export function AdminBadge({ variant = 'success', children }) {
  return <span className={`admin-badge admin-badge-${variant}`}>{children}</span>
}

/**
 * AdminSearchBox — search input with icon
 */
export function AdminSearchBox({ placeholder, value = '', onChange }) {
  return (
    <div className="admin-search-box">
      <span className="admin-search-icon" aria-hidden="true">
        <AppIcon name="search" size={15} />
      </span>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
      />
    </div>
  )
}

/**
 * AdminSectionCard — white card with title
 */
export function AdminSectionCard({ title, children }) {
  return (
    <div className="admin-card">
      {title ? <div className="admin-card-title">{title}</div> : null}
      {children}
    </div>
  )
}

/**
 * AdminTable — generic table wrapper
 * columns: [{ key, label }]
 * rows: array of objects
 * renderCell: optional (row, columnKey) => node
 */
export function AdminTable({ columns, rows, renderCell }) {
  return (
    <div className="admin-table-container">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column.key}>
                  {renderCell ? renderCell(row, column.key) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * AdminIconBtn — small square icon button (edit/delete)
 * danger: red hover variant
 */
export function AdminIconBtn({ icon, danger = false, size = 14, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      className={`admin-icon-btn${danger ? ' danger' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <AppIcon name={icon} size={size} />
    </button>
  )
}

/**
 * AdminToolbar — action button row
 */
export function AdminToolbar({ children }) {
  return <div className="admin-toolbar">{children}</div>
}