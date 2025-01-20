import { createEventType } from '#core/event-type-factory';

// Task board event

export const TaskBoardCreated = createEventType('task-board-created')<{
  taskBoardId: string;
}>();

export const TaskAddedToTaskBoard = createEventType('task-added')<{
  taskBoardId: string;
  taskId: string;
}>();

export const TaskRemovedFromTaskBoard = createEventType('task-removed')<{
  taskBoardId: string;
  taskId: string;
}>();

export type TaskBoardCreated = InstanceType<typeof TaskBoardCreated>;
export type TaskAddedToTaskBoard = InstanceType<typeof TaskAddedToTaskBoard>;
export type TaskRemovedFromTaskBoard = InstanceType<
  typeof TaskRemovedFromTaskBoard
>;

export type TaskBoardEvent =
  | TaskBoardCreated
  | TaskAddedToTaskBoard
  | TaskRemovedFromTaskBoard;

export const isTaskBoardEvent = (event: unknown): event is TaskBoardEvent => {
  return (
    event != null &&
    ((event as TaskBoardEvent).type === TaskBoardCreated.type ||
      (event as TaskBoardEvent).type === TaskAddedToTaskBoard.type ||
      (event as TaskBoardEvent).type === TaskRemovedFromTaskBoard.type)
  );
};

// Task event

export const TaskCreated = createEventType('task-created')<{
  taskId: string;
  title: string;
  description: string;
  status: string;
  assigneeId?: string;
}>();

export const TaskStatusChanged = createEventType('task-status-changed')<{
  taskId: string;
  status: string;
}>();

export const TaskAssigneeChanged = createEventType('task-assignee-changed')<{
  taskId: string;
  assigneeId?: string;
}>();

export type TaskCreated = InstanceType<typeof TaskCreated>;
export type TaskStatusChanged = InstanceType<typeof TaskStatusChanged>;
export type TaskAssigneeChanged = InstanceType<typeof TaskAssigneeChanged>;

export type TaskEvent = TaskCreated | TaskStatusChanged | TaskAssigneeChanged;

export const isTaskEvent = (event: unknown): event is TaskEvent => {
  return (
    event != null &&
    ((event as TaskEvent).type === TaskCreated.type ||
      (event as TaskEvent).type === TaskStatusChanged.type ||
      (event as TaskEvent).type === TaskAssigneeChanged.type)
  );
};
