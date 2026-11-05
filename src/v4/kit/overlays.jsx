import { Button, Drawer, Modal } from '@heroui/react'
import { Loader2 } from 'lucide-react'

/** Controlled modal. Put form fields in `children` and buttons in `footer`; `onSubmit` wraps both in a form. */
export function Dialog({ open, onClose, title, description, icon, children, footer, onSubmit, size = 'sm:max-w-lg' }) {
  const body = (
    <>
      <Modal.Header>
        {icon && <Modal.Icon className="bg-accent-soft text-accent-soft-foreground">{icon}</Modal.Icon>}
        <Modal.Heading>{title}</Modal.Heading>
        {description && <p className="text-sm text-muted">{description}</p>}
      </Modal.Header>
      <Modal.Body className="grid gap-4">{children}</Modal.Body>
      {footer && <Modal.Footer>{footer}</Modal.Footer>}
    </>
  )
  return (
      <Modal.Backdrop isOpen={open} onOpenChange={(o) => !o && onClose()}>
        <Modal.Container>
          <Modal.Dialog className={size}>
            <Modal.CloseTrigger />
            {onSubmit ? <form onSubmit={onSubmit} noValidate className="contents">{body}</form> : body}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
  )
}

/**
 * Controlled side panel from the right (full screen on phones). The body scrolls; header and footer stay put.
 * Note: Drawer.Content is HeroUI's full-screen positioner, so the width belongs on Drawer.Dialog.
 */
export function Panel({ open, onClose, title, description, children, footer, onSubmit, width = 'sm:w-[34rem]' }) {
  const inner = (
    <>
      <Drawer.Header className="shrink-0 border-b border-border pr-12 pb-4">
        <Drawer.Heading>{title}</Drawer.Heading>
        {description && <p className="text-sm text-muted">{description}</p>}
      </Drawer.Header>
      <Drawer.Body className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto py-5">{children}</Drawer.Body>
      {footer && <Drawer.Footer className="shrink-0 gap-2 border-t border-border pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</Drawer.Footer>}
    </>
  )
  return (
      <Drawer.Backdrop isOpen={open} onOpenChange={(o) => !o && onClose()}>
        <Drawer.Content placement="right">
          <Drawer.Dialog className={`flex h-full w-full max-w-full flex-col ${width}`}>
            <Drawer.CloseTrigger />
            {onSubmit ? <form onSubmit={onSubmit} noValidate className="flex h-full min-h-0 flex-col">{inner}</form> : inner}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
  )
}

/** Primary submit button with a pending spinner. */
export function SubmitButton({ pending, children, ...rest }) {
  return <Button type="submit" isPending={pending} {...rest}>{pending && <Loader2 className="size-4 animate-spin" />}{children}</Button>
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm:max-w-md"
      footer={<>
        <Button variant="tertiary" onPress={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} isPending={loading} onPress={onConfirm}>{confirmLabel}</Button>
      </>}>
      {message && <p className="text-sm text-muted">{message}</p>}
    </Dialog>
  )
}
