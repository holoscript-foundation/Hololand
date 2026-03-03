/**
 * VoiceNotification Component
 *
 * Toast notification system for voice events:
 *   - "User joined channel"
 *   - "User left channel"
 *   - "You were muted by moderator"
 *   - Auto-dismiss after 3 seconds
 *
 * Uses the useVoiceNotifications hook for event-driven notifications
 * from the VoiceChannelManager. Renders as a fixed overlay stack in
 * the bottom-right corner with slide-in/fade-out animations.
 *
 * @module voice/VoiceNotification
 */

import React, { useEffect, useState, useCallback } from 'react';
import type { VoiceNotificationEvent } from './useVoice';

// ============================================================================
// Props
// ============================================================================

export interface VoiceNotificationProps {
  /** Array of active notification events. */
  notifications: VoiceNotificationEvent[];
  /** Callback to dismiss a notification by ID. */
  onDismiss: (id: string) => void;
  /** Position of the notification stack. */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** Optional CSS class name for the container. */
  className?: string;
}

// ============================================================================
// Notification Type Config
// ============================================================================

interface NotificationStyle {
  icon: React.ReactNode;
  borderColor: string;
  iconBgColor: string;
  textColor: string;
}

function getNotificationStyle(type: VoiceNotificationEvent['type']): NotificationStyle {
  switch (type) {
    case 'join':
      return {
        icon: <JoinIcon className="w-4 h-4 text-green-400" />,
        borderColor: 'border-green-500/30',
        iconBgColor: 'bg-green-500/10',
        textColor: 'text-green-300',
      };
    case 'leave':
      return {
        icon: <LeaveIcon className="w-4 h-4 text-neutral-400" />,
        borderColor: 'border-neutral-600/30',
        iconBgColor: 'bg-neutral-500/10',
        textColor: 'text-neutral-300',
      };
    case 'muted-by-mod':
      return {
        icon: <MutedIcon className="w-4 h-4 text-amber-400" />,
        borderColor: 'border-amber-500/30',
        iconBgColor: 'bg-amber-500/10',
        textColor: 'text-amber-300',
      };
    case 'error':
      return {
        icon: <ErrorIcon className="w-4 h-4 text-red-400" />,
        borderColor: 'border-red-500/30',
        iconBgColor: 'bg-red-500/10',
        textColor: 'text-red-300',
      };
    case 'info':
    default:
      return {
        icon: <InfoIcon className="w-4 h-4 text-indigo-400" />,
        borderColor: 'border-indigo-500/30',
        iconBgColor: 'bg-indigo-500/10',
        textColor: 'text-indigo-300',
      };
  }
}

// ============================================================================
// Individual Toast
// ============================================================================

function VoiceToast({
  notification,
  onDismiss,
}: {
  notification: VoiceNotificationEvent;
  onDismiss: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);
  const style = getNotificationStyle(notification.type);

  // Animate exit before dismissal
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 200);
  }, [notification.id, onDismiss]);

  // Start exit animation 200ms before auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => setIsExiting(true), 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg
        bg-neutral-900/90 ${style.borderColor}
        transition-all duration-200 ease-out
        ${isExiting ? 'opacity-0 translate-x-4 scale-95' : 'opacity-100 translate-x-0 scale-100'}
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full ${style.iconBgColor} flex items-center justify-center`}>
        {style.icon}
      </div>

      {/* Message */}
      <p className={`text-sm ${style.textColor} flex-1 min-w-0`}>
        {notification.message}
      </p>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-md text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
        aria-label="Dismiss notification"
      >
        <CloseIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ============================================================================
// Position Mapping
// ============================================================================

const positionClasses: Record<NonNullable<VoiceNotificationProps['position']>, string> = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
};

// ============================================================================
// Main Component
// ============================================================================

export function VoiceNotification({
  notifications,
  onDismiss,
  position = 'bottom-right',
  className = '',
}: VoiceNotificationProps) {
  if (notifications.length === 0) return null;

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2 w-80 ${className}`}
      aria-label="Voice notifications"
      role="log"
    >
      {notifications.map((n) => (
        <VoiceToast key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ============================================================================
// Inline SVG Icons
// ============================================================================

function JoinIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="11" x2="20" y2="17" />
      <line x1="17" y1="14" x2="23" y2="14" />
    </svg>
  );
}

function LeaveIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="17" y1="14" x2="23" y2="14" />
    </svg>
  );
}

function MutedIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function ErrorIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function InfoIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function CloseIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
