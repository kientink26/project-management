import { EventStore } from '#core/event-store';
import { createMessageForwarder } from '#core/message-forwarder';
import {
  AddNewTaskToTaskBoardCommand,
  RemoveTaskFromTaskBoardCommand,
  UpdateTaskAssigneeCommand,
  UpdateTaskStatusCommand,
} from './commands';
import {
  addTaskToTaskBoard,
  applyTaskBoardEvents,
  initialTaskBoardState,
  removeTaskFromTaskBoard,
  toTaskBoardStreamName,
} from './task-board-write-model';
import {
  applyTaskEvents,
  createTask,
  initialTaskState,
  toTaskStreamName,
  updateTaskAssignee,
  updateTaskStatus,
} from './task-write-model';

export class CommandHandlers {
  #eventStore: EventStore;

  constructor({ eventStore }: { eventStore: EventStore }) {
    this.#eventStore = eventStore;
  }

  handleCommand = createMessageForwarder(this, { messageSuffix: 'Command' });

  async handleAddNewTaskToTaskBoardCommand({
    data,
  }: AddNewTaskToTaskBoardCommand) {
    const { taskId, taskBoardId, title, description, status, assigneeId } =
      data;
    const events = createTask({
      taskId,
      title,
      description,
      status,
      assigneeId,
    });
    await this.#eventStore.save(toTaskStreamName(taskId), events, {
      expectedVersion: null,
    });

    const taskBoardStreamName = toTaskBoardStreamName(taskBoardId);
    const { events: taskBoardEvents, currentVersion } =
      await this.#eventStore.load(taskBoardStreamName);

    if (taskBoardEvents.length === 0) {
      throw new Error('not found');
    }
    const newTaskBoardEvents = addTaskToTaskBoard(
      applyTaskBoardEvents(initialTaskBoardState, taskBoardEvents),
      taskId,
    );
    await this.#eventStore.save(taskBoardStreamName, newTaskBoardEvents, {
      expectedVersion: currentVersion,
    });
  }

  async handleRemoveTaskFromTaskBoardCommand({
    data: { taskBoardId, taskId },
  }: RemoveTaskFromTaskBoardCommand) {
    const taskBoardStreamName = toTaskBoardStreamName(taskBoardId);

    const { events, currentVersion } =
      await this.#eventStore.load(taskBoardStreamName);

    if (events.length === 0) {
      throw new Error('not found');
    }
    const newEvents = removeTaskFromTaskBoard(
      applyTaskBoardEvents(initialTaskBoardState, events),
      taskId,
    );
    await this.#eventStore.save(taskBoardStreamName, newEvents, {
      expectedVersion: currentVersion,
    });
  }

  async handleUpdateTaskAssigneeCommand({
    data: { taskId, assigneeId },
  }: UpdateTaskAssigneeCommand) {
    const streamName = toTaskStreamName(taskId);

    const { events, currentVersion } = await this.#eventStore.load(streamName);

    if (events.length === 0) {
      throw new Error('not found');
    }
    const newEvents = updateTaskAssignee(
      applyTaskEvents(initialTaskState, events),
      assigneeId,
    );
    await this.#eventStore.save(streamName, newEvents, {
      expectedVersion: currentVersion,
    });
  }

  async handleUpdateTaskStatusCommand({
    data: { taskId, status },
  }: UpdateTaskStatusCommand) {
    const streamName = toTaskStreamName(taskId);

    const { events, currentVersion } = await this.#eventStore.load(streamName);

    if (events.length === 0) {
      throw new Error('not found');
    }
    const newEvents = updateTaskStatus(
      applyTaskEvents(initialTaskState, events),
      status,
    );
    await this.#eventStore.save(streamName, newEvents, {
      expectedVersion: currentVersion,
    });
  }
}
