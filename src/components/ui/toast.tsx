// src/components/ui/toast.tsx — minimal shadcn-compatible primitives
import * as React from "react"

type ToastProps = React.HTMLAttributes<HTMLDivElement> & {
  action?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Toast({ className, children, ...props }: ToastProps) {
  return (
    <div
      role="status"
      className={"pointer-events-auto rounded-xl border border-border bg-base-800 p-3 shadow " + (className || "")}
      {...props}
    >
      {children}
    </div>
  )
}

export const ToastTitle: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...p }) => (
  <div className={"text-sm font-semibold " + (className || "")} {...p} />
)

export const ToastDescription: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...p }) => (
  <div className={"text-sm text-muted-foreground " + (className || "")} {...p} />
)

export const ToastClose: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...p }) => (
  <button className={"ml-3 rounded-md px-2 py-1 text-xs hover:bg-base-700 " + (className || "")} aria-label="Close" {...p}>
    ✕
  </button>
)

export const ToastViewport: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...p }) => (
  <div
    className={"fixed bottom-4 right-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 " + (className || "")}
    {...p}
  />
)

type ProviderProps = { children?: React.ReactNode }
export const ToastProvider: React.FC<ProviderProps> = ({ children }) => <>{children}</>
