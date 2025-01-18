import { StreamAggregator } from '#core/streams';
import {
  JSONEventType,
  ResolvedEvent,
  StreamingRead,
} from '@eventstore/db-client';

//////////////////////////////////////
/// Events
//////////////////////////////////////

export type TaskCreated = JSONEventType<
  'task-created',
  {
    taskId: string;
    title: string;
    description: string;
    status: string;
    assigneeId?: string;
  }
>;

export type TaskStatusChanged = JSONEventType<
  'task-status-changed',
  {
    taskId: string;
    status: string;
  }
>;

export type TaskAssigneeChanged = JSONEventType<
  'task-assignee-changed',
  {
    taskId: string;
    assigneeId?: string;
  }
>;

export type TaskEvent = TaskCreated | TaskStatusChanged | TaskAssigneeChanged;

export const isTaskEvent = (event: unknown): event is TaskEvent => {
  return (
    event != null &&
    ((event as TaskEvent).type === 'task-created' ||
      (event as TaskEvent).type === 'task-status-changed' ||
      (event as TaskEvent).type === 'task-assignee-changed')
  );
};

//////////////////////////////////////
/// Entity/State
//////////////////////////////////////

export const enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId?: string;
}

export const toTaskStreamName = (taskId: string) => `task-${taskId}`;

export const enum TaskErrors {
  CREATED_EXISTING_TASK = 'CREATED_EXISTING_TASK',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  UNKNOWN_EVENT_TYPE = 'UNKNOWN_EVENT_TYPE',
}

//////////////////////////////////////
/// Getting the state from events
//////////////////////////////////////

export const getTask = StreamAggregator<Task, TaskEvent>(
  (currentState, event) => {
    if (event.type === 'task-created') {
      if (currentState != null) throw TaskErrors.CREATED_EXISTING_TASK;
      const { taskId, title, description, status, assigneeId } = event.data;
      return {
        id: taskId,
        title,
        description,
        status: status as TaskStatus,
        assigneeId,
      };
    }

    if (currentState == null) throw TaskErrors.TASK_NOT_FOUND;

    switch (event.type) {
      case 'task-status-changed':
        return {
          ...currentState,
          status: event.data.status as TaskStatus,
        };
      case 'task-assignee-changed':
        return {
          ...currentState,
          assigneeId: event.data.assigneeId,
        };
      default: {
        const _: never = event;
        throw TaskErrors.UNKNOWN_EVENT_TYPE;
      }
    }
  },
);

//////////////////////////////////////
/// Create task
//////////////////////////////////////

export type CreateTask = {
  taskId: string;
  title: string;
  description: string;
  status: string;
  assigneeId?: string;
};

export const createTask = ({
  taskId,
  title,
  description,
  status,
  assigneeId,
}: CreateTask): TaskCreated => {
  return {
    type: 'task-created',
    data: {
      taskId,
      title,
      description,
      status,
      assigneeId,
    },
  };
};

//////////////////////////////////////
/// Update task status
//////////////////////////////////////

export type UpdateTaskStatus = {
  taskId: string;
  status: string;
};

export const updateTaskStatus = async (
  events: StreamingRead<ResolvedEvent<TaskEvent>>,
  { taskId, status }: UpdateTaskStatus,
): Promise<TaskStatusChanged> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const task = await getTask(events);

  return {
    type: 'task-status-changed',
    data: {
      taskId,
      status,
    },
  };
};

//////////////////////////////////////
/// Update task assignee
//////////////////////////////////////

export type UpdateTaskAssignee = {
  taskId: string;
  assigneeId?: string;
};

export const updateTaskAssignee = async (
  events: StreamingRead<ResolvedEvent<TaskEvent>>,
  { taskId, assigneeId }: UpdateTaskAssignee,
): Promise<TaskAssigneeChanged> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const task = await getTask(events);

  return {
    type: 'task-assignee-changed',
    data: {
      taskId,
      assigneeId,
    },
  };
};
