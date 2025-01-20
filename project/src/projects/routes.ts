import { v4 as uuid } from 'uuid';
import { sendCreated } from '#core/http';
import { NextFunction, Request, Response, Router } from 'express';
import { assertNotEmptyString } from '#core/validation';
import {
  getMembersCollection,
  getProjectsCollection,
} from './projectProjection';
import { toObjectId } from '#core/mongoDB';
import { CommandHandlers } from './command-handler';
import { EventStoreDBEventStore } from '#core/event-store-db';
import {
  AddMemberToProjectCommand,
  CreateProjectCommand,
  RemoveMemberFromProjectCommand,
  UpdateMemberRoleCommand,
  UpdateProjectNameCommand,
} from './commands';

//////////////////////////////////////
/// Routes
//////////////////////////////////////
const commandHandler = new CommandHandlers({
  eventStore: EventStoreDBEventStore.getInstance(),
});

export const router = Router();

// Create project

type CreateProjectRequest = Request<
  unknown,
  unknown,
  Partial<{ name: string; ownerId: string }>
>;

router.post(
  '/',
  async (
    request: CreateProjectRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const projectId = uuid();
      const taskBoardId = uuid();

      await commandHandler.handleCommand(
        new CreateProjectCommand({
          data: {
            projectId,
            name: assertNotEmptyString(request.body.name),
            taskBoardId,
            ownerId: assertNotEmptyString(request.body.ownerId),
          },
        }),
      );

      sendCreated(response, projectId);
    } catch (error) {
      next(error);
    }
  },
);

// Add member to project

type AddMemberToProjectRequest = Request<
  Partial<{ projectId: string }>,
  unknown,
  Partial<{ userId: string; role: string }>
>;

router.put(
  '/:projectId/add-member',
  async (
    request: AddMemberToProjectRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const memberId = uuid();

      await commandHandler.handleCommand(
        new AddMemberToProjectCommand({
          data: {
            projectId: assertNotEmptyString(request.params.projectId),
            memberId,
            userId: assertNotEmptyString(request.body.userId),
            role: assertNotEmptyString(request.body.role),
          },
        }),
      );
      response.sendStatus(200);
    } catch (error) {
      next(error);
    }
  },
);

// // Remove member from project

type RemoveMemberFromTeamRequest = Request<
  Partial<{ projectId: string }>,
  unknown,
  Partial<{ memberId: string }>
>;

router.put(
  '/:projectId/remove-member',
  async (
    request: RemoveMemberFromTeamRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      await commandHandler.handleCommand(
        new RemoveMemberFromProjectCommand({
          data: {
            projectId: assertNotEmptyString(request.params.projectId),
            memberId: assertNotEmptyString(request.body.memberId),
          },
        }),
      );
      response.sendStatus(200);
    } catch (error) {
      next(error);
    }
  },
);

// // Rename project

type RenameProjectRequest = Request<
  Partial<{ projectId: string }>,
  unknown,
  Partial<{ name: string }>
>;

router.put(
  '/:projectId',
  async (
    request: RenameProjectRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      await commandHandler.handleCommand(
        new UpdateProjectNameCommand({
          data: {
            projectId: assertNotEmptyString(request.params.projectId),
            name: assertNotEmptyString(request.body.name),
          },
        }),
      );
      response.sendStatus(200);
    } catch (error) {
      next(error);
    }
  },
);

// Update member role

type UpdateMemberRoleRequest = Request<
  Partial<{ memberId: string }>,
  unknown,
  Partial<{ role: string }>
>;

router.put(
  '/members/:memberId',
  async (
    request: UpdateMemberRoleRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      await commandHandler.handleCommand(
        new UpdateMemberRoleCommand({
          data: {
            memberId: assertNotEmptyString(request.params.memberId),
            role: assertNotEmptyString(request.body.role),
          },
        }),
      );
      response.sendStatus(200);
    } catch (error) {
      next(error);
    }
  },
);

// Find Project by id

router.get(
  '/:projectId',
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      const projects = await getProjectsCollection();

      const result = await projects.findOne({
        _id: toObjectId(assertNotEmptyString(request.params.projectId)),
      });

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

// Find Projects By Collaborating User or Owner

type FindProjectsRequest = Request<
  unknown,
  unknown,
  unknown,
  Partial<{ ownerId: string; userId: string }>
>;

router.get(
  '/',
  async (
    request: FindProjectsRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const projects = await getProjectsCollection();

      let result;

      if (request.query.ownerId) {
        // Find Projects By Owner
        result = await projects
          .find({
            ownerId: assertNotEmptyString(request.query.ownerId),
          })
          .toArray();
      } else {
        // Find Projects By Collaborating User
        const members = await getMembersCollection();
        const projectIds = (
          await members
            .find({
              userId: assertNotEmptyString(request.query.userId),
            })
            .project({ projectId: 1 })
            .toArray()
        )
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          .map((mb) => mb.projectId);

        result = await projects
          .find({
            projectId: { $in: projectIds },
          })
          .toArray();
      }

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
