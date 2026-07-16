import React, { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import axe from 'axe-core';
import AdminActionDialog from '../AdminActionDialog';
import { AdminDrawer, CursorPagination } from '../AdminPrimitives';
import { confirmAdminAction, promptAdminAction } from '@/lib/adminDialogs';

describe('admin accessibility primitives', () => {
  it('traps dialog focus, exposes modal semantics, cancels with Escape, and returns focus', async () => {
    render(
      <>
        <button type="button">Action trigger</button>
        <AdminActionDialog />
      </>
    );
    const trigger = screen.getByRole('button', { name: 'Action trigger' });
    trigger.focus();
    let decision!: Promise<boolean>;
    act(() => {
      decision = confirmAdminAction({
        title: 'Delete draft?',
        description: 'This action cannot be undone.',
        danger: true,
      });
    });
    const dialog = await screen.findByRole('dialog', { name: 'Delete draft?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    fireEvent.keyDown(document, { key: 'Escape' });
    await expect(decision).resolves.toBe(false);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('validates prompted audit evidence and has no serious or critical axe violations', async () => {
    render(<AdminActionDialog />);
    let answer!: Promise<string | null>;
    act(() => {
      answer = promptAdminAction({
        title: 'Record evidence',
        description: 'This becomes audit evidence.',
        label: 'Reason',
        minLength: 3,
      });
    });
    await screen.findByRole('dialog', { name: 'Record evidence' });
    const input = screen.getByRole('textbox', { name: 'Reason' });
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(continueButton).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Verified source' } });
    expect(continueButton).toBeEnabled();
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(
      results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))
    ).toEqual([]);
    fireEvent.click(continueButton);
    await expect(answer).resolves.toBe('Verified source');
  });

  it('supports keyboard-safe drawers and 44px cursor controls', async () => {
    function Example() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open detail
          </button>
          {open && (
            <AdminDrawer label="Patient detail" onClose={() => setOpen(false)}>
              <button type="button">Inside action</button>
            </AdminDrawer>
          )}
          <CursorPagination
            page={2}
            canPrevious
            canNext
            onPrevious={() => undefined}
            onNext={() => undefined}
            itemLabel="patients"
          />
        </>
      );
    }
    render(<Example />);
    expect(screen.getByRole('dialog', { name: 'Patient detail' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveClass('min-h-[44px]');
    expect(screen.getByRole('button', { name: 'Next' })).toHaveClass('min-h-[44px]');
  });
});
