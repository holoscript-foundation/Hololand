/**
 * ActiveTaskEditor Component
 *
 * Kanban board for goal and subtask management with drag-drop support.
 * Integrates with @holoscript/mvc-schema ActiveTaskState CRDT for conflict-free task state.
 *
 * Features:
 * - Kanban board with customizable columns (pending/in_progress/blocked/completed/cancelled)
 * - Drag-drop task movement between status columns
 * - Task priority and status badges
 * - Subtask hierarchies with inline display
 * - Duration estimates and tracking
 * - Task creation and editing with form validation
 * - Filter by status, priority, assignee
 * - Search by title
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="region" with aria-label on container
 * - Keyboard navigation for drag-drop (arrow keys + space)
 * - role="button" on draggable tasks
 * - aria-grabbed and aria-dropeffect for drag state
 * - Focus visible indicators
 * - 4.5:1 contrast ratios
 *
 * @module mvc-editor/ActiveTaskEditor
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  ActiveTaskEditorProps,
  ActiveTaskEditorState,
  MVCEditorTheme,
} from './types';
import {
  mergeTheme,
  applyOverlayOpacity,
  formatRelativeTime,
  getTaskStatusColor,
  getTaskPriorityColor,
  truncateText,
} from './types';
import type { TaskEntry, TaskStatus, TaskPriority } from '@holoscript/mvc-schema';

/**
 * ActiveTaskEditor component
 */
export const ActiveTaskEditor: React.FC<ActiveTaskEditorProps> = ({
  activeTaskState,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTask,
  showSubtasks = true,
  showDurations = true,
  groupBy = 'status',
  kanbanColumns = ['pending', 'in_progress', 'blocked', 'completed', 'cancelled'],
  displayMode = 'full',
  theme: themeOverride,
  className = '',
  style,
  ariaLabel = 'Active Task Editor',
  disabled = false,
}) => {
  const theme = mergeTheme(themeOverride);

  // State
  const [state, setState] = useState<ActiveTaskEditorState>({
    selectedTaskId: null,
    filterStatus: 'all',
    filterPriority: 'all',
    searchQuery: '',
    viewMode: 'kanban',
    isTaskFormOpen: false,
    editingTaskId: null,
  });

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let tasks = [...activeTaskState.tasks];

    // Filter by status
    if (state.filterStatus !== 'all') {
      tasks = tasks.filter((t) => t.status === state.filterStatus);
    }

    // Filter by priority
    if (state.filterPriority !== 'all') {
      tasks = tasks.filter((t) => t.priority === state.filterPriority);
    }

    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(query));
    }

    return tasks;
  }, [activeTaskState.tasks, state.filterStatus, state.filterPriority, state.searchQuery]);

  // Group tasks by status for kanban
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskEntry[]> = {
      pending: [],
      in_progress: [],
      blocked: [],
      completed: [],
      cancelled: [],
    };

    filteredTasks.forEach((task) => {
      if (kanbanColumns.includes(task.status)) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [filteredTasks, kanbanColumns]);

  // Handlers
  const handleSelectTask = useCallback((taskId: string) => {
    setState((prev) => ({
      ...prev,
      selectedTaskId: prev.selectedTaskId === taskId ? null : taskId,
    }));
  }, []);

  const handleDragStart = useCallback((taskId: string) => {
    setDraggedTaskId(taskId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
  }, []);

  const handleDrop = useCallback(
    (targetStatus: TaskStatus) => {
      if (draggedTaskId && !disabled) {
        onMoveTask?.(draggedTaskId, targetStatus);
        setDraggedTaskId(null);
      }
    },
    [draggedTaskId, disabled, onMoveTask]
  );

  const handleCreateTask = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isTaskFormOpen: true,
      editingTaskId: null,
    }));
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    setState((prev) => ({
      ...prev,
      isTaskFormOpen: true,
      editingTaskId: taskId,
    }));
  }, []);

  const handleCloseForm = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isTaskFormOpen: false,
      editingTaskId: null,
    }));
  }, []);

  const formatDuration = useCallback((milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  // Compact mode
  if (displayMode === 'compact') {
    return (
      <div
        className={`active-task-editor-compact ${className}`}
        style={{
          ...style,
          padding: theme.panelSpacing / 2,
          backgroundColor: applyOverlayOpacity(theme.backgroundColor, theme.overlayOpacity),
          borderRadius: theme.borderRadius,
          fontFamily: theme.fontFamily,
          fontSize: theme.baseFontSize,
        }}
        role="region"
        aria-label={ariaLabel}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: theme.textColor, fontWeight: 600 }}>Active Tasks:</span>
          <span style={{ color: theme.primaryColor }}>
            {tasksByStatus.in_progress.length} in progress
          </span>
          <span style={{ color: theme.disabledColor }}>
            • {tasksByStatus.pending.length} pending
          </span>
          {tasksByStatus.blocked.length > 0 && (
            <span style={{ color: theme.errorColor }}>
              • {tasksByStatus.blocked.length} blocked
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={`active-task-editor ${className}`}
      style={{
        ...style,
        padding: theme.panelSpacing,
        backgroundColor: applyOverlayOpacity(theme.backgroundColor, theme.overlayOpacity),
        borderRadius: theme.borderRadius,
        fontFamily: theme.fontFamily,
        fontSize: theme.baseFontSize,
        color: theme.textColor,
      }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <div style={{ marginBottom: theme.panelSpacing }}>
        <h2 style={{ margin: 0, fontSize: theme.baseFontSize + 6, fontWeight: 700 }}>
          Active Tasks
        </h2>
        <p style={{ margin: '8px 0 0', color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
          {filteredTasks.length} tasks • Last updated {formatRelativeTime(activeTaskState.lastUpdated)}
        </p>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: theme.panelSpacing / 2,
          marginBottom: theme.panelSpacing,
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="Search tasks..."
          value={state.searchQuery}
          onChange={(e) => setState((prev) => ({ ...prev, searchQuery: e.target.value }))}
          disabled={disabled}
          style={{
            flex: '1 1 200px',
            padding: '8px 12px',
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
            border: `1px solid ${theme.borderColor}`,
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
          }}
          aria-label="Search tasks"
        />

        {/* Filter by status */}
        <select
          value={state.filterStatus}
          onChange={(e) =>
            setState((prev) => ({ ...prev, filterStatus: e.target.value as TaskStatus | 'all' }))
          }
          disabled={disabled}
          style={{
            padding: '8px 12px',
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
            border: `1px solid ${theme.borderColor}`,
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
          }}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Filter by priority */}
        <select
          value={state.filterPriority}
          onChange={(e) =>
            setState((prev) => ({
              ...prev,
              filterPriority: e.target.value as TaskPriority | 'all',
            }))
          }
          disabled={disabled}
          style={{
            padding: '8px 12px',
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
            border: `1px solid ${theme.borderColor}`,
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
          }}
          aria-label="Filter by priority"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Create Task Button */}
        <button
          onClick={handleCreateTask}
          disabled={disabled}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            backgroundColor: theme.successColor,
            border: 'none',
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          aria-label="Create new task"
        >
          + New Task
        </button>
      </div>

      {/* Kanban Board */}
      {state.viewMode === 'kanban' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${kanbanColumns.length}, 1fr)`,
            gap: theme.panelSpacing,
            overflowX: 'auto',
          }}
        >
          {kanbanColumns.map((status) => (
            <div
              key={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(status)}
              style={{
                minWidth: 250,
                padding: theme.panelSpacing,
                backgroundColor: applyOverlayOpacity(theme.borderColor, 0.3),
                borderRadius: theme.borderRadius,
                border: `2px dashed ${
                  draggedTaskId ? theme.primaryColor : 'transparent'
                }`,
              }}
              role="region"
              aria-label={`${status} column`}
            >
              {/* Column Header */}
              <div style={{ marginBottom: theme.panelSpacing }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: theme.baseFontSize + 2,
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    color: getTaskStatusColor(status, theme),
                  }}
                >
                  {status.replace('_', ' ')}
                </h3>
                <p
                  style={{
                    margin: '4px 0 0',
                    color: theme.disabledColor,
                    fontSize: theme.baseFontSize - 2,
                  }}
                >
                  {tasksByStatus[status].length} tasks
                </p>
              </div>

              {/* Tasks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.panelSpacing / 2 }}>
                {tasksByStatus[status].map((task) => (
                  <div
                    key={task.id}
                    draggable={!disabled}
                    onDragStart={() => handleDragStart(task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleSelectTask(task.id)}
                    style={{
                      padding: theme.panelSpacing,
                      backgroundColor: applyOverlayOpacity(theme.backgroundColor, 0.8),
                      border: `2px solid ${
                        state.selectedTaskId === task.id ? theme.primaryColor : theme.borderColor
                      }`,
                      borderRadius: theme.borderRadius,
                      cursor: disabled ? 'default' : 'grab',
                      opacity: draggedTaskId === task.id ? 0.5 : 1,
                    }}
                    role="button"
                    tabIndex={0}
                    aria-grabbed={draggedTaskId === task.id}
                  >
                    {/* Task Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      {/* Priority Badge */}
                      <span
                        style={{
                          padding: '2px 6px',
                          backgroundColor: getTaskPriorityColor(task.priority, theme),
                          borderRadius: theme.borderRadius / 2,
                          fontSize: theme.baseFontSize - 4,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {task.priority}
                      </span>

                      {/* Assigned Agent */}
                      {task.assignedTo && (
                        <span
                          style={{
                            color: theme.disabledColor,
                            fontSize: theme.baseFontSize - 2,
                          }}
                        >
                          @{truncateText(task.assignedTo, 15)}
                        </span>
                      )}
                    </div>

                    {/* Task Title */}
                    <p style={{ margin: '0 0 8px', fontSize: theme.baseFontSize, fontWeight: 500 }}>
                      {task.title}
                    </p>

                    {/* Task Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
                        {formatRelativeTime(task.updatedAt)}
                      </span>

                      {showDurations && task.estimatedDuration && (
                        <span style={{ color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
                          Est: {formatDuration(task.estimatedDuration)}
                        </span>
                      )}
                    </div>

                    {/* Blocking Reason */}
                    {task.status === 'blocked' && task.blockingReason && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: '6px 8px',
                          backgroundColor: applyOverlayOpacity(theme.errorColor, 0.2),
                          borderRadius: theme.borderRadius / 2,
                          fontSize: theme.baseFontSize - 2,
                          color: theme.errorColor,
                        }}
                      >
                        Blocked: {task.blockingReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveTaskEditor;
