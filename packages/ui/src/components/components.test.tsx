import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';
import { Dialog } from './Dialog';
import { Badge } from './Badge';
import { Text } from './Text';
import { ConfirmationDialog } from './ConfirmationDialog';

describe('Switch', () => {
  it('toggles via keyboard and reports changes', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Wi-Fi" />);
    screen.getByRole('switch', { name: 'Wi-Fi' }).focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Text', () => {
  it('renders the semantic tag for the variant', () => {
    render(<Text variant="large-title">Hello</Text>);
    const heading = screen.getByRole('heading', { level: 1, name: 'Hello' });
    expect(heading.tagName).toBe('H1');
  });
});

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge tone="success">Ready</Badge>);
    expect(screen.getByText('Ready').textContent).toBe('Ready');
  });
});

describe('Dialog', () => {
  it('is hidden when closed and a modal when open', () => {
    const { rerender } = render(<Dialog open={false} onClose={() => {}} title="Settings" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<Dialog open onClose={() => {}} title="Settings" />);
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('closes on Escape when dismissable', async () => {
    const onClose = vi.fn();
    render(<Dialog open onClose={onClose} title="Settings" />);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('ConfirmationDialog', () => {
  it('requires an explicit confirm click (no auto-confirm)', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        open
        title="Delete?"
        message="This cannot be undone."
        destructive
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    expect(onConfirm).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
