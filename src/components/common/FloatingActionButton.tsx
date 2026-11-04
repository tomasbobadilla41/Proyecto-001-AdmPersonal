import type { LucideIcon } from 'lucide-react'

interface FloatingActionButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
}

export function FloatingActionButton({ icon: Icon, label, onClick }: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 flex md:bottom-6 md:right-6 items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-on-accent shadow-lg shadow-accent/20 transition-transform hover:scale-105"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}
