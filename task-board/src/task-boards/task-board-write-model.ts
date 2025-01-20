import {
  TaskAddedToTaskBoard,
  TaskBoardCreated,
  TaskBoardEvent,
  TaskRemovedFromTaskBoard,
} from './events';

type State = {
  id: string;
  taskIds: string[];
};

export const initialTaskBoardState = {
  id: '',
  taskIds: [],
};

export const toTaskBoardStreamName = (taskBoardId: string) =>
  `task-board-${taskBoardId}`;

export const applyTaskBoardEvents = (state: State, events: TaskBoardEvent[]) =>
  events.reduce(applyEvent, state);

const applyEvent = (state: State, event: TaskBoardEvent): State => {
  if (event.type === TaskBoardCreated.type) {
    return {
      id: event.data.taskBoardId,
      taskIds: [],
    };
  }

  switch (event.type) {
    case TaskAddedToTaskBoard.type:
      return {
        ...state,
        taskIds: [...state.taskIds, event.data.taskId],
      };
    case TaskRemovedFromTaskBoard.type:
      return {
        ...state,
        taskIds: state.taskIds.filter(
          (memberId) => memberId === event.data.taskId,
        ),
      };
  }

  return { ...state };
};

export const createTaskBoard = (taskBoardId: string) => {
  return [new TaskBoardCreated({ taskBoardId })];
};

export const addTaskToTaskBoard = (state: State, taskId: string) => {
  return [new TaskAddedToTaskBoard({ taskBoardId: state.id, taskId })];
};

export const removeTaskFromTaskBoard = (state: State, taskId: string) => {
  return [new TaskRemovedFromTaskBoard({ taskBoardId: state.id, taskId })];
};
