import { createContext, useContext } from 'react'

const SheetContext = createContext({ open: false, onOpenChange: () => {} })

function Sheet({ children, open, onOpenChange }) {
  return <SheetContext.Provider value={{ open, onOpenChange }}>{children}</SheetContext.Provider>
}

function SheetContent({ children, className = '', side = 'right' }) {
  const { open, onOpenChange } = useContext(SheetContext)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" className="absolute inset-0 cursor-default bg-[#0e3b43]/5" onClick={() => onOpenChange(false)} aria-label="Close drawer" />
      <aside className={`absolute inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} z-10 h-full shadow-2xl ${className}`}>
        {children}
      </aside>
    </div>
  )
}

function SheetHeader({ children, className = '' }) {
  return <header className={className}>{children}</header>
}

function SheetTitle({ children, className = '' }) {
  return <h2 className={className}>{children}</h2>
}

export { Sheet, SheetContent, SheetHeader, SheetTitle }
