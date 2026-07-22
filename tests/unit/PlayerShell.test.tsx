import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerShell } from '@/activities/PlayerShell';

describe('PlayerShell', () => {
  it('renders the title + competency and fires onQuit', async () => {
    const onQuit = vi.fn();
    render(
      <PlayerShell title="Budgeting Basics" competency="C4" level="BEGINNER" onQuit={onQuit} />,
    );

    expect(screen.getByRole('heading', { name: 'Budgeting Basics' })).toBeInTheDocument();
    expect(screen.getByText('C4 · BEGINNER')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /quit/i }));
    expect(onQuit).toHaveBeenCalledOnce();
  });

  it('shows a hint button only when onHint is provided', () => {
    const { rerender } = render(<PlayerShell title="T" onQuit={() => {}} />);
    expect(screen.queryByRole('button', { name: /hint/i })).toBeNull();

    rerender(<PlayerShell title="T" onQuit={() => {}} onHint={() => {}} />);
    expect(screen.getByRole('button', { name: /hint/i })).toBeInTheDocument();
  });
});
