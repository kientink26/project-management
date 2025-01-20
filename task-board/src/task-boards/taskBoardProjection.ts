import {
  getMongoCollection,
  retryIfNotFound,
  retryIfNotUpdated,
  toObjectId,
} from '../core/mongoDB';
import { SubscriptionResolvedEvent } from '../core/subscriptions';
import {
  isTaskEvent,
  TaskAssigneeChanged,
  TaskCreated,
  TaskStatusChanged,
} from './events';
import {
  isTaskBoardEvent,
  TaskAddedToTaskBoard,
  TaskRemovedFromTaskBoard,
} from './events';

//////////////////////////////////////
/// Task Board Read Model projection
//////////////////////////////////////

export const getTasksCollection = () => getMongoCollection<Task>('tasks');

type Task = Readonly<{
  taskId: string;
  title: string;
  description: string;
  status: string;
  assigneeId?: string;
  taskBoardId?: string;
  revision: number;
}>;

export const projectToTaskBoardReadModel = (
  resolvedEvent: SubscriptionResolvedEvent,
): Promise<void> => {
  if (
    resolvedEvent.event === undefined ||
    !(isTaskBoardEvent(resolvedEvent.event) || isTaskEvent(resolvedEvent.event))
  )
    return Promise.resolve();

  const { event } = resolvedEvent;
  const streamRevision = Number(event.revision);

  switch (event.type) {
    case TaskCreated.type:
      return taskCreated(event, streamRevision);
    case TaskAddedToTaskBoard.type:
      return taskAdded(event, streamRevision);
    case TaskRemovedFromTaskBoard.type:
      return taskRemoved(event, streamRevision);
    case TaskStatusChanged.type:
      return taskStatusChanged(event, streamRevision);
    case TaskAssigneeChanged.type:
      return taskAssigneeChanged(event, streamRevision);
    default:
      return Promise.resolve();
  }
};

export const taskCreated = async (
  event: TaskCreated,
  streamRevision: number,
): Promise<void> => {
  const tasks = await getTasksCollection();

  const { taskId, title, description, status, assigneeId } = event.data;

  await tasks.insertOne({
    _id: toObjectId(taskId),
    taskId,
    title,
    description,
    status,
    assigneeId,
    revision: streamRevision,
  });
};

export const taskAdded = async (
  event: TaskAddedToTaskBoard,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  streamRevision: number,
): Promise<void> => {
  const tasks = await getTasksCollection();

  await retryIfNotUpdated(() =>
    tasks.updateOne(
      {
        _id: toObjectId(event.data.taskId),
      },
      {
        $set: {
          taskBoardId: event.data.taskBoardId,
        },
      },
      { upsert: false },
    ),
  );
};

export const taskRemoved = async (
  event: TaskRemovedFromTaskBoard,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  streamRevision: number,
): Promise<void> => {
  const tasks = await getTasksCollection();

  await retryIfNotUpdated(() =>
    tasks.updateOne(
      {
        _id: toObjectId(event.data.taskId),
      },
      {
        $set: {
          taskBoardId: undefined,
        },
      },
      { upsert: false },
    ),
  );
};

export const taskStatusChanged = async (
  event: TaskStatusChanged,
  streamRevision: number,
): Promise<void> => {
  const tasks = await getTasksCollection();
  const lastRevision = streamRevision - 1;

  const { revision } = await retryIfNotFound(() =>
    tasks.findOne(
      {
        _id: toObjectId(event.data.taskId),
        revision: { $gte: lastRevision },
      },
      {
        projection: { revision: 1 },
      },
    ),
  );

  if (revision > lastRevision) {
    return;
  }

  await retryIfNotUpdated(() =>
    tasks.updateOne(
      {
        _id: toObjectId(event.data.taskId),
        revision: lastRevision,
      },
      {
        $set: {
          status: event.data.status,
          revision: streamRevision,
        },
      },
      { upsert: false },
    ),
  );
};

export const taskAssigneeChanged = async (
  event: TaskAssigneeChanged,
  streamRevision: number,
): Promise<void> => {
  const tasks = await getTasksCollection();
  const lastRevision = streamRevision - 1;

  const { revision } = await retryIfNotFound(() =>
    tasks.findOne(
      {
        _id: toObjectId(event.data.taskId),
        revision: { $gte: lastRevision },
      },
      {
        projection: { revision: 1 },
      },
    ),
  );

  if (revision > lastRevision) {
    return;
  }

  await retryIfNotUpdated(() =>
    tasks.updateOne(
      {
        _id: toObjectId(event.data.taskId),
        revision: lastRevision,
      },
      {
        $set: {
          assigneeId: event.data.assigneeId,
          revision: streamRevision,
        },
      },
      { upsert: false },
    ),
  );
};
