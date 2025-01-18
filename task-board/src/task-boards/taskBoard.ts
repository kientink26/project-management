import { StreamAggregator } from '#core/streams';
import {
  JSONEventType,
  ResolvedEvent,
  StreamingRead,
} from '@eventstore/db-client';

//////////////////////////////////////
/// Events
//////////////////////////////////////

export type TaskBoardCreated = JSONEventType<
  'task-board-created',
  {
    taskBoardId: string;
  }
>;

export type TaskAddedToTaskBoard = JSONEventType<
  'task-added',
  {
    taskBoardId: string;
    taskId: string;
  }
>;

export type TaskRemovedFromTaskBoard = JSONEventType<
  'task-removed',
  {
    taskBoardId: string;
    taskId: string;
  }
>;

export type TaskBoardEvent =
  | TaskBoardCreated
  | TaskAddedToTaskBoard
  | TaskRemovedFromTaskBoard;

export const isTaskBoardEvent = (event: unknown): event is TaskBoardEvent => {
  return (
    event != null &&
    ((event as TaskBoardEvent).type === 'task-board-created' ||
      (event as TaskBoardEvent).type === 'task-added' ||
      (event as TaskBoardEvent).type === 'task-removed')
  );
};

//////////////////////////////////////
/// Entity/State
//////////////////////////////////////

export interface TaskBoard {
  id: string;
  taskIds: string[];
}

export const toTaskBoardStreamName = (taskBoardId: string) =>
  `task-board-${taskBoardId}`;

export const enum TaskBoardErrors {
  CREATED_EXISTING_TASK_BOARD = 'CREATED_EXISTING_TASK_BOARD',
  TASK_BOARD_NOT_FOUND = 'TASK_BOARD_NOT_FOUND',
  UNKNOWN_EVENT_TYPE = 'UNKNOWN_EVENT_TYPE',
}

//////////////////////////////////////
/// Getting the state from events
//////////////////////////////////////

export const getTaskBoard = StreamAggregator<TaskBoard, TaskBoardEvent>(
  (currentState, event) => {
    if (event.type === 'task-board-created') {
      if (currentState != null)
        throw TaskBoardErrors.CREATED_EXISTING_TASK_BOARD;
      return {
        id: event.data.taskBoardId,
        taskIds: [],
      };
    }

    if (currentState == null) throw TaskBoardErrors.TASK_BOARD_NOT_FOUND;

    switch (event.type) {
      case 'task-added':
        return {
          ...currentState,
          taskIds: [...currentState.taskIds, event.data.taskId],
        };
      case 'task-removed':
        return {
          ...currentState,
          taskIds: currentState.taskIds.filter(
            (memberId) => memberId === event.data.taskId,
          ),
        };
      default: {
        const _: never = event;
        throw TaskBoardErrors.UNKNOWN_EVENT_TYPE;
      }
    }
  },
);

//////////////////////////////////////
/// Create task board
//////////////////////////////////////

export type CreateTaskBoard = {
  taskBoardId: string;
};

export const createTaskBoard = ({
  taskBoardId,
}: CreateTaskBoard): TaskBoardCreated => {
  return {
    type: 'task-board-created',
    data: {
      taskBoardId,
    },
  };
};

//////////////////////////////////////
/// Add task to task board
//////////////////////////////////////

export type AddTaskToTaskBoard = {
  taskBoardId: string;
  taskId: string;
};

export const addTaskToTaskBoard = async (
  events: StreamingRead<ResolvedEvent<TaskBoardEvent>>,
  { taskBoardId, taskId }: AddTaskToTaskBoard,
): Promise<TaskAddedToTaskBoard> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const taskBoard = await getTaskBoard(events);

  return {
    type: 'task-added',
    data: {
      taskBoardId,
      taskId,
    },
  };
};

//////////////////////////////////////
/// Remove task from task board
//////////////////////////////////////

export type RemoveTaskFromTaskBoard = {
  taskBoardId: string;
  taskId: string;
};

export const removeTaskFromTaskBoard = async (
  events: StreamingRead<ResolvedEvent<TaskBoardEvent>>,
  { taskBoardId, taskId }: RemoveTaskFromTaskBoard,
): Promise<TaskRemovedFromTaskBoard> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const taskBoard = await getTaskBoard(events);

  return {
    type: 'task-removed',
    data: {
      taskBoardId,
      taskId,
    },
  };
};
