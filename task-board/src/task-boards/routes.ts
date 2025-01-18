import { v4 as uuid } from 'uuid';
import { create, update } from '#core/commandHandling';
import { getEventStore } from '#core/streams';
import { NextFunction, Request, Response, Router } from 'express';
import { assertNotEmptyString } from '#core/validation';
import {
  createTask,
  toTaskStreamName,
  updateTaskAssignee,
  updateTaskStatus,
} from './task';
import {
  addTaskToTaskBoard,
  createTaskBoard,
  removeTaskFromTaskBoard,
  toTaskBoardStreamName,
} from './taskBoard';
import { getTasksCollection } from './taskBoardProjection';
import { sendCreated } from '#core/http';

//////////////////////////////////////
/// Routes
//////////////////////////////////////

export const router = Router();

// Create task board

router.post(
  '/',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const taskBoardId = uuid();
      const streamName = toTaskBoardStreamName(taskBoardId);

      await create(getEventStore(), createTaskBoard)(streamName, {
        taskBoardId,
      });

      sendCreated(response, taskBoardId);
    } catch (error) {
      next(error);
    }
  },
);

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
      // First, create a new task
      const taskId = uuid();
      const taskStreamName = toTaskStreamName(taskId);
      await create(getEventStore(), createTask)(taskStreamName, {
        taskId,
        title: assertNotEmptyString(request.body.title),
        description: assertNotEmptyString(request.body.description),
        status: assertNotEmptyString(request.body.status),
        assigneeId: request.body.assigneeId,
      });

      // Second, add task to task board
      const taskBoardId = assertNotEmptyString(request.params.taskBoardId);
      const taskBoardStreamName = toTaskBoardStreamName(taskBoardId);

      await update(getEventStore(), addTaskToTaskBoard)(taskBoardStreamName, {
        taskBoardId,
        taskId,
      });

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
      const taskBoardId = assertNotEmptyString(request.params.taskBoardId);
      const streamName = toTaskBoardStreamName(taskBoardId);

      await update(getEventStore(), removeTaskFromTaskBoard)(streamName, {
        taskBoardId,
        taskId: assertNotEmptyString(request.body.taskId),
      });

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
      const streamName = toTaskStreamName(taskId);

      if (request.body.status) {
        await update(getEventStore(), updateTaskStatus)(streamName, {
          taskId,
          status: assertNotEmptyString(request.body.status),
        });
      } else {
        await update(getEventStore(), updateTaskAssignee)(streamName, {
          taskId,
          assigneeId: request.body.assigneeId,
        });
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
