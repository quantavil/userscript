import type { ComponentChildren } from "preact";
/** Only static, repository-owned SVG strings enter this component. */
export function Icon({ svg }: { svg: string }) {
  return <span aria-hidden="true" class="aiw-icon" dangerouslySetInnerHTML={{ __html: svg }} />;
}
export interface ToastMessage {
  text: string;
  action?: () => void;
}
export type Notify = (text: string, action?: () => void) => void;
export function Toast({ message }: { message: ToastMessage | null }) {
  return (
    message && (
      <div class="aiw-toast visible" role="status">
        {message.text}
        {message.action && (
          <button class="aiw-toast-action" onClick={message.action}>
            Undo
          </button>
        )}
      </div>
    )
  );
}
export function Drawer({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ComponentChildren;
}) {
  return (
    <section class="aiw-drawer-overlay aiw-open" aria-label={title}>
      <header class="aiw-drawer-header">
        <h2 class="aiw-drawer-title">{title}</h2>
        <button class="aiw-drawer-close" onClick={onBack} aria-label={`Back from ${title}`}>
          ←
        </button>
      </header>
      {children}
    </section>
  );
}
