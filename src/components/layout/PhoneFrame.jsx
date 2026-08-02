/**
 * PhoneFrame
 * Mobile-first container that wraps every screen.
 * Provides the max-width 480px phone shell.
 */
function PhoneFrame({ children, className = '' }) {
  return (
    <div className="phone">
      {children}
    </div>
  )
}

export default PhoneFrame