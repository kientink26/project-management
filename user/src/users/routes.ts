import { v4 as uuid } from 'uuid';
import { create, update } from '#core/commandHandling';
import { getEventStore } from '#core/streams';
import { sendCreated } from '#core/http';
import { NextFunction, Request, Response, Router } from 'express';
import { assertNotEmptyString } from '#core/validation';
import { createUser, toUserStreamName, updateUserRole } from './user';
import { Password } from 'src/utils/password';
import { getUsersCollection } from './userProjection';
import jwt from 'jsonwebtoken';
import { authenticate, UserPayload } from '#core/authenticate';
import { requireAuth } from '#core/require-auth';

//////////////////////////////////////
/// Routes
//////////////////////////////////////

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

      const streamName = toUserStreamName(userId);

      await create(getEventStore(), createUser)(streamName, {
        userId,
        password: await Password.toHash(
          assertNotEmptyString(request.body.password),
        ),
        email: assertNotEmptyString(request.body.email),
        role: assertNotEmptyString(request.body.role),
      });

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
  Partial<{ email: string; password: string }>
>;

router.post(
  '/login',
  async (request: LoginUserRequest, response: Response, next: NextFunction) => {
    try {
      const users = await getUsersCollection();

      const user = await users.findOne({
        email: assertNotEmptyString(request.body.email),
      });

      if (!user) {
        return next(new Error('invalid credential'));
      }
      const passwordMatch = await Password.compare(
        user.password,
        assertNotEmptyString(request.body.password),
      );

      if (!passwordMatch) {
        return next(new Error('invalid credential'));
      }

      // Generate JWT
      const userJwt = jwt.sign(
        {
          id: String(user._id),
          role: user.role,
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
      const userId = assertNotEmptyString(request.params.userId);
      const streamName = toUserStreamName(userId);

      await update(getEventStore(), updateUserRole)(streamName, {
        userId,
        role: assertNotEmptyString(request.body.role),
      });

      response.sendStatus(200);
    } catch (error) {
      next(error);
    }
  },
);
