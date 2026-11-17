import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  NotificationDropdown,
  formatRelativeTime,
} from './NotificationDropdown';
import { notificationService } from '../../services/notificationService';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useUIStore } from '../../store/useUIStore';

vi.mock('../../services/notificationService', () => ({
  notificationService: {
    listNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('NotificationDropdown Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notificationService.listNotifications.mockResolvedValue({
      notifications: [],
      total: 0,
      unreadCount: 0,
    });
    useNotificationStore.getState().clearStore();
    useWorkspaceStore.setState({ activeWorkspaceId: 'ws-100' });
    useUIStore.setState({ selectedCardId: null });
  });

  describe('formatRelativeTime helper', () => {
    it('handles empty or invalid inputs', () => {
      expect(formatRelativeTime(null)).toBe('');
      expect(formatRelativeTime(undefined)).toBe('');
      expect(formatRelativeTime('not-a-date')).toBe('');
    });

    it('formats recent timestamps accurately', () => {
      const now = new Date();
      expect(formatRelativeTime(now.toISOString())).toBe('Just now');

      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatRelativeTime(fiveMinsAgo.toISOString())).toBe('5m ago');

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      expect(formatRelativeTime(twoHoursAgo.toISOString())).toBe('2h ago');

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      expect(formatRelativeTime(threeDaysAgo.toISOString())).toBe('3d ago');
    });
  });

  describe('Bell button and badge', () => {
    it('renders bell trigger without badge when unreadCount is 0', () => {
      render(
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      );

      const trigger = screen.getByRole('button', { name: /^notifications$/i });
      expect(trigger).toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('renders badge with count when unreadCount > 0', () => {
      useNotificationStore.setState({ unreadCount: 5 });

      render(
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      );

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /notifications, 5 unread/i })
      ).toBeInTheDocument();
    });

    it('caps badge display at 99+ when unreadCount > 99', () => {
      useNotificationStore.setState({ unreadCount: 150 });

      render(
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('Dropdown interactions', () => {
    it('toggles dropdown open on click and fetches notifications', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.spyOn(useNotificationStore.getState(), 'fetchNotifications');

      render(
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      );

      const button = screen.getByRole('button', { name: /^notifications/i });
      await user.click(button);

      expect(useNotificationStore.getState().isDropdownOpen).toBe(true);
      expect(screen.getByRole('menu', { name: /notification center/i })).toBeInTheDocument();
      expect(fetchSpy).toHaveBeenCalledWith({ workspaceId: 'ws-100' });
    });

    it('renders empty state when there are no notifications', async () => {
      useNotificationStore.setState({
        isDropdownOpen: true,
        notifications: [],
        unreadCount: 0,
      });

      render(
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('No notifications yet')).toBeInTheDocument();
      });
      expect(screen.getByText(/When you are assigned tasks/i)).toBeInTheDocument();
    });

    it('renders list of notifications with read and unread status', async () => {
      const mockItems = [
        {
          id: 'n-1',
          title: 'Assigned to Bug Fix',
          message: 'You were assigned to Bug Fix card',
          type: 'task_assignment',
          resourceType: 'card',
          resourceId: 'card-123',
          workspace: 'ws-100',
          isRead: false,
          createdAt: new Date().toISOString(),
          actor: { name: 'Alice Dev' },
        },
        {
          id: 'n-2',
          title: 'New Comment on Feature',
          message: 'Bob commented on Feature',
          type: 'card_comment',
          resourceType: 'card',
          resourceId: 'card-456',
          workspace: 'ws-100',
          isRead: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          actor: { name: 'Bob Reviewer' },
        },
      ];

      notificationService.listNotifications.mockResolvedValueOnce({
        notifications: mockItems,
        unreadCount: 1,
        total: 2,
      });

      useNotificationStore.setState({
        isDropdownOpen: true,
        unreadCount: 1,
        notifications: mockItems,
      });

      render(
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Assigned to Bug Fix')).toBeInTheDocument();
      });
      expect(screen.getByText('New Comment on Feature')).toBeInTheDocument();
      expect(screen.getByText('Alice Dev')).toBeInTheDocument();
      expect(screen.getByText('Bob Reviewer')).toBeInTheDocument();
      expect(screen.getByText('1 new')).toBeInTheDocument();
      expect(screen.getByText(/Mark all read/i)).toBeInTheDocument();
    });

    it('clicking an unread notification marks it as read and navigates to card details', async () => {
      const user = userEvent.setup();
      notificationService.markAsRead.mockResolvedValueOnce({ id: 'n-1', isRead: true });
      const openCardDetailsSpy = vi.fn();

      useNotificationStore.setState({
        isDropdownOpen: true,
        unreadCount: 1,
        notifications: [
          {
            id: 'n-1',
            title: 'Assigned to Urgent Card',
            message: 'Please review urgently',
            type: 'task_assignment',
            resourceType: 'card',
            resourceId: 'card-999',
            workspace: 'ws-100',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
      });
      useUIStore.setState({ openCardDetails: openCardDetailsSpy });

      render(
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      );

      const notifItem = screen.getByText('Assigned to Urgent Card');
      await user.click(notifItem);

      expect(notificationService.markAsRead).toHaveBeenCalledWith('n-1');
      expect(mockNavigate).toHaveBeenCalledWith('/board');
      expect(openCardDetailsSpy).toHaveBeenCalledWith('card-999');
      expect(useNotificationStore.getState().isDropdownOpen).toBe(false);
    });

    it('clicking "Mark all read" calls markAllAsRead with active workspace', async () => {
      const user = userEvent.setup();
      notificationService.markAllAsRead.mockResolvedValueOnce({ modifiedCount: 2 });

      useNotificationStore.setState({
        isDropdownOpen: true,
        unreadCount: 3,
        notifications: [
          { id: 'n-1', title: 'Task 1', isRead: false },
          { id: 'n-2', title: 'Task 2', isRead: false },
        ],
      });

      render(
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      );

      const markAllBtn = screen.getByRole('button', { name: /mark all read/i });
      await user.click(markAllBtn);

      expect(notificationService.markAllAsRead).toHaveBeenCalledWith('ws-100');
    });

    it('filters between All and Unread tabs correctly', async () => {
      const user = userEvent.setup();

      useNotificationStore.setState({
        isDropdownOpen: true,
        unreadCount: 1,
        notifications: [
          { id: 'n-1', title: 'Unread Item', isRead: false },
          { id: 'n-2', title: 'Read Item', isRead: true },
        ],
      });

      render(
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      );

      // On 'All' tab, both items are displayed
      expect(screen.getByText('Unread Item')).toBeInTheDocument();
      expect(screen.getByText('Read Item')).toBeInTheDocument();

      // Click 'Unread (1)' tab
      const unreadTab = screen.getByRole('button', { name: /unread \(1\)/i });
      await user.click(unreadTab);

      // Now only unread item should be displayed
      expect(screen.getByText('Unread Item')).toBeInTheDocument();
      expect(screen.queryByText('Read Item')).not.toBeInTheDocument();
    });

    it('allows deleting a notification via delete button', async () => {
      const user = userEvent.setup();
      notificationService.deleteNotification.mockResolvedValueOnce(true);

      useNotificationStore.setState({
        isDropdownOpen: true,
        unreadCount: 1,
        notifications: [
          { id: 'n-del', title: 'Delete Me', isRead: false },
        ],
      });

      render(
        <MemoryRouter>
          <NotificationDropdown />
        </MemoryRouter>
      );

      const deleteBtn = screen.getByRole('button', { name: /delete notification/i });
      await user.click(deleteBtn);

      expect(notificationService.deleteNotification).toHaveBeenCalledWith('n-del');
    });
  });
});
