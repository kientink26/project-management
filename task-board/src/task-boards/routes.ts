import { v4 as uuid } from 'uuid';
import { NextFunction, Request, Response, Router } from 'express';
import { assertNotEmptyString } from '#core/validation';
import { getTasksCollection } from './taskBoardProjection';
import { sendCreated } from '#core/http';
import { CommandHandlers } from './command-handler';
import {
  AddNewTaskToTaskBoardCommand,
  RemoveTaskFromTaskBoardCommand,
  UpdateTaskAssigneeCommand,
  UpdateTaskStatusCommand,
} from './commands';
import { EventStoreDBEventStore } from '#core/event-store-db';

//////////////////////////////////////
/// Routes
//////////////////////////////////////
const commandHandler = new CommandHandlers({
  eventStore: EventStoreDBEventStore.getInstance(),
});

export const router = Router();

// Add task to taskboard

type AddTaskToTaskBoardRequest = Request<
  Partial<{ taskBoardId: string }>,
  unknown,
  Partial<{
    title: string;
    description: string;
    status: string;
    assigneeId: string;
  }>
>;

router.put(
  '/:taskBoardId/add-task',
  async (
    request: AddTaskToTaskBoardRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const taskId = uuid();

      await commandHandler.handleCommand(
        new AddNewTaskToTaskBoardCommand({
          data: {
            taskId,
            taskBoardId: assertNotEmptyString(request.params.taskBoardId),
            title: assertNotEmptyString(request.body.title),
            description: assertNotEmptyString(request.body.description),
            status: assertNotEmptyString(request.body.status),
            assigneeId: request.body.assigneeId,
          },
        }),
      );

      response.sendStatus(200);
    } catch (error) {
      next(error);
    }
  },
);

// Remove task from task board

type RemoveTaskFromTaskBoardRequest = Request<
  Partial<{ taskBoardId: string }>,
  unknown,
  Partial<{ taskId: string }>
>;

router.put(
  '/:taskBoardId/remove-task',
  async (
    request: RemoveTaskFromTaskBoardRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      await commandHandler.handleCommand(
        new RemoveTaskFromTaskBoardCommand({
          data: {
            taskBoardId: assertNotEmptyString(request.params.taskBoardId),
            taskId: assertNotEmptyString(request.body.taskId),
          },
        }),
      );

      response.sendStatus(200);
    } catch (error) {
      next(error);
    }
  },
);

// Update task

type UpdateTaskRequest = Request<
  Partial<{ taskId: string }>,
  unknown,
  Partial<{ status: string; assigneeId: string }>
>;

router.put(
  '/tasks/:taskId',
  async (
    request: UpdateTaskRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const taskId = assertNotEmptyString(request.params.taskId);

      if (request.body.status) {
        await commandHandler.handleCommand(
          new UpdateTaskStatusCommand({
            data: {
              taskId,
              status: assertNotEmptyString(request.body.status),
            },
          }),
        );
      } else {
        await commandHandler.handleCommand(
          new UpdateTaskAssigneeCommand({
            data: {
              taskId,
              assigneeId: request.body.assigneeId,
            },
          }),
        );
      }

      response.sendStatus(200);
    } catch (error) {
      next(error);
    }
  },
);

// Find Tasks on task board

type FindTasksRequest = Request<
  unknown,
  unknown,
  unknown,
  Partial<{ taskBoardId: string }>
>;

router.get(
  '/tasks',
  async (request: FindTasksRequest, response: Response, next: NextFunction) => {
    try {
      const tasks = await getTasksCollection();

      const result = await tasks
        .find({
          taskBoardId: assertNotEmptyString(request.query.taskBoardId),
        })
        .toArray();

      if (result == null) {
        response.sendStatus(404);
        return;
      }

      response.send(result);
    } catch (error) {
      next(error);
    }
  },
);
