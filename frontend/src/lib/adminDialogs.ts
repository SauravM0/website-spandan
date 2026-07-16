'use client';

export type AdminConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
};

export type AdminPromptOptions = AdminConfirmOptions & {
  label: string;
  defaultValue?: string;
  multiline?: boolean;
  minLength?: number;
};

type DialogRequest =
  | ({ kind: 'confirm' } & AdminConfirmOptions & { resolve: (value: boolean) => void })
  | ({ kind: 'prompt' } & AdminPromptOptions & { resolve: (value: string | null) => void });

export const ADMIN_DIALOG_REQUEST = 'admin-dialog-request';

function dispatch<T>(request: Omit<DialogRequest, 'resolve'>, resolve: (value: T) => void) {
  window.dispatchEvent(
    new CustomEvent(ADMIN_DIALOG_REQUEST, { detail: { ...request, resolve } as DialogRequest })
  );
}

export function confirmAdminAction(options: AdminConfirmOptions): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return new Promise((resolve) => dispatch({ kind: 'confirm', ...options }, resolve));
}

export function promptAdminAction(options: AdminPromptOptions): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => dispatch({ kind: 'prompt', ...options }, resolve));
}

export type { DialogRequest };
