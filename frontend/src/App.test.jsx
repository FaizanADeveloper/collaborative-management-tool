import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { EmptyState } from './components/common/EmptyState';
import { ConfirmDialog } from './components/common/ConfirmDialog';

describe('Frontend Application Shell & Design System', () => {
  it('renders the application shell and supports light/dark theme switching', () => {
    render(<App />);
    expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);

    const themeButton = screen.getByRole('button', { name: /switch to light theme/i });
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(themeButton);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument();
  });

  it('renders EmptyState with actionable CTA', () => {
    let clicked = false;
    render(
      <EmptyState
        title="No boards found"
        description="Create your first Kanban board to organize lists and cards."
        actionLabel="Create Board"
        onAction={() => {
          clicked = true;
        }}
      />
    );

    expect(screen.getByText('No boards found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create Board' }));
    expect(clicked).toBe(true);
  });

  it('renders accessible ConfirmDialog when open', () => {
    let confirmed = false;
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={() => {}}
        onConfirm={() => {
          confirmed = true;
        }}
        title="Delete List"
        description="Deleting this list will permanently delete all cards inside it."
        confirmLabel="Delete List"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete List' }));
    expect(confirmed).toBe(true);
  });
});
