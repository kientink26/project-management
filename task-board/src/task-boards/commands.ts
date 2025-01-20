import { createMessageType } from '#core/message-type-factory';

export const AddNewTaskToTaskBoardCommand = createMessageType(
  'AddNewTaskToTaskBoard',
)<{
  taskId: string;
  taskBoardId: string;
  title: string;
  description: string;
  status: string;
  assigneeId?: string;
}>();

export const RemoveTaskFromTaskBoardCommand = createMessageType(
  'RemoveTaskFromTaskBoard',
)<{
  taskBoardId: string;
  taskId: string;
}>();

export const UpdateTaskStatusCommand = createMessageType('UpdateTaskStatus')<{
  taskId: string;
  status: string;
}>();

export const UpdateTaskAssigneeCommand = createMessageType(
  'UpdateTaskAssignee',
)<{
  taskId: string;
  assigneeId?: string;
}>();

export type AddNewTaskToTaskBoardCommand = InstanceType<
  typeof AddNewTaskToTaskBoardCommand
>;
export type RemoveTaskFromTaskBoardCommand = InstanceType<
  typeof RemoveTaskFromTaskBoardCommand
>;
export type UpdateTaskStatusCommand = InstanceType<
  typeof UpdateTaskStatusCommand
>;
export type UpdateTaskAssigneeCommand = InstanceType<
  typeof UpdateTaskAssigneeCommand
>;
