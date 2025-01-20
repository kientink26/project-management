import {
  TaskAssigneeChanged,
  TaskCreated,
  TaskEvent,
  TaskStatusChanged,
} from './events';

export const enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

const validStatus: string[] = [
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.DONE,
];

type State = {
  id: string;
  title: string;
  description: string;
  status: string;
  assigneeId?: string;
};

export const initialTaskState = {
  id: '',
  title: '',
  description: '',
  status: '',
};

export const toTaskStreamName = (taskId: string) => `task-${taskId}`;

export const applyTaskEvents = (state: State, events: TaskEvent[]) =>
  events.reduce(applyEvent, state);

const applyEvent = (state: State, event: TaskEvent): State => {
  if (event.type === TaskCreated.type) {
    const { taskId, title, description, status, assigneeId } = event.data;
    return {
      id: taskId,
      title,
      description,
      status,
      assigneeId,
    };
  }

  switch (event.type) {
    case TaskStatusChanged.type:
      return {
        ...state,
        status: event.data.status,
      };
    case TaskAssigneeChanged.type:
      return {
        ...state,
        assigneeId: event.data.assigneeId,
      };
  }

  return { ...state };
};

export type CreateTaskArgs = {
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
}: CreateTaskArgs) => {
  if (!validStatus.includes(status)) {
    throw new Error('invalid status');
  }
  return [new TaskCreated({ taskId, title, description, status, assigneeId })];
};

export const updateTaskStatus = (state: State, status: string) => {
  if (!validStatus.includes(status)) {
    throw new Error('invalid status');
  }
  return [new TaskStatusChanged({ taskId: state.id, status })];
};

export const updateTaskAssignee = (state: State, assigneeId?: string) => {
  return [new TaskAssigneeChanged({ taskId: state.id, assigneeId })];
};
