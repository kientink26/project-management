import { v4 as uuid } from 'uuid';
import { sendCreated } from '#core/http';
import { NextFunction, Request, Response, Router } from 'express';
import { assertNotEmptyString } from '#core/validation';
import { getUsersCollection } from './userProjection';
import jwt from 'jsonwebtoken';
import { authenticate, UserPayload } from '#core/authenticate';
import { requireAuth } from '#core/require-auth';
import { CommandHandlers } from './command-handler';
import { EventStoreDBEventStore } from '#core/event-store-db';
import {
  CreateUserCommand,
  LoginUserCommand,
  UpdateUserRoleCommand,
} from './command';

//////////////////////////////////////
/// Routes
//////////////////////////////////////
const commandHandler = new CommandHandlers({
  eventStore: new EventStoreDBEventStore({
    connectionString: process.env.EVENTSTORE_URI!,
  }),
});

export const router = Router();

// Create user

type CreateUserRequest = Request<
  unknown,
  unknown,
  Partial<{ email: string; password: string; role: string }>
>;

router.post(
  '/',
  async (
    request: CreateUserRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = uuid();

      await commandHandler.handleCommand(
        new CreateUserCommand({
          data: {
            userId,
            email: assertNotEmptyString(request.body.email),
            password: assertNotEmptyString(request.body.password),
            role: assertNotEmptyString(request.body.role),
          },
        }),
      );

      // Generate JWT
      const userJwt = jwt.sign(
        {
          id: userId,
          role: request.body.role!,
        } satisfies UserPayload,
        process.env.JWT_KEY!,
      );

      // Store it on session object
      request.session = {
        jwt: userJwt,
      };

      sendCreated(response, userId);
    } catch (error) {
      next(error);
    }
  },
);

// Login user

type LoginUserRequest = Request<
  unknown,
  unknown,
  Partial<{ userId: string; password: string }>
>;

router.post(
  '/login',
  async (request: LoginUserRequest, response: Response, next: NextFunction) => {
    try {
      await commandHandler.handleCommand(
        new LoginUserCommand({
          data: {
            userId: assertNotEmptyString(request.body.userId),
            password: assertNotEmptyString(request.body.password),
          },
        }),
      );

      const users = await getUsersCollection();

      const user = await users.findOne({
        userId: assertNotEmptyString(request.body.userId),
      });

      // Generate JWT
      const userJwt = jwt.sign(
        {
          id: String(user!._id),
          role: user!.role,
        } satisfies UserPayload,
        process.env.JWT_KEY!,
      );

      // Store it on session object
      request.session = {
        jwt: userJwt,
      };

      response.status(200).send({ jwt: userJwt });
    } catch (error) {
      next(error);
    }
  },
);

// Get current user

router.get(
  '/current-user',
  authenticate,
  async (request: Request, response: Response, next: NextFunction) => {
    response.send({ currentUser: request.currentUser || null });
  },
);

// Update user role

type UpdateUserRoleRequest = Request<
  Partial<{ userId: string }>,
  unknown,
  Partial<{ role: string }>
>;

router.put(
  '/:userId',
  authenticate,
  requireAuth,
  async (
    request: UpdateUserRoleRequest,
    response: Response,
    next: NextFunction,
  ) => {
    try {
      await commandHandler.handleCommand(
        new UpdateUserRoleCommand({
          data: {
            userId: assertNotEmptyString(request.params.userId),
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
