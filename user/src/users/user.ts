import { StreamAggregator } from '#core/streams';
import {
  JSONEventType,
  ResolvedEvent,
  StreamingRead,
} from '@eventstore/db-client';

//////////////////////////////////////
/// Events
//////////////////////////////////////

export type UserCreated = JSONEventType<
  'user-created',
  {
    userId: string;
    password: string;
    email: string;
    role: string;
  }
>;

export type UserRoleChanged = JSONEventType<
  'user-role-changed',
  {
    userId: string;
    role: string;
  }
>;

export type UserEvent = UserCreated | UserRoleChanged;

export const isUserEvent = (event: unknown): event is UserEvent => {
  return (
    event != null &&
    ((event as UserEvent).type === 'user-created' ||
      (event as UserEvent).type === 'user-role-changed')
  );
};

//////////////////////////////////////
/// Entity/State
//////////////////////////////////////

export interface User {
  id: string;
  password: string;
  email: string;
  role: string;
}

export const toUserStreamName = (userId: string) => `user-${userId}`;

export const enum UserErrors {
  CREATED_EXISTING_USER = 'CREATED_EXISTING_USER',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  UNKNOWN_EVENT_TYPE = 'UNKNOWN_EVENT_TYPE',
}

//////////////////////////////////////
/// Getting the state from events
//////////////////////////////////////

export const getUser = StreamAggregator<User, UserEvent>(
  (currentState, event) => {
    if (event.type === 'user-created') {
      if (currentState != null) throw UserErrors.CREATED_EXISTING_USER;
      return {
        id: event.data.userId,
        role: event.data.role,
        password: event.data.password,
        email: event.data.email,
      };
    }

    if (currentState == null) throw UserErrors.USER_NOT_FOUND;

    switch (event.type) {
      case 'user-role-changed':
        return {
          ...currentState,
          role: event.data.role,
        };
      default: {
        const _: never = event;
        throw UserErrors.UNKNOWN_EVENT_TYPE;
      }
    }
  },
);

//////////////////////////////////////
/// Create user
//////////////////////////////////////

export type CreateUser = {
  userId: string;
  role: string;
  password: string;
  email: string;
};

export const createUser = ({
  userId,
  role,
  password,
  email,
}: CreateUser): UserCreated => {
  return {
    type: 'user-created',
    data: {
      userId,
      role,
      password,
      email,
    },
  };
};

//////////////////////////////////////
/// Update user role
//////////////////////////////////////

export type UpdateUserRole = {
  userId: string;
  role: string;
};

export const updateUserRole = async (
  events: StreamingRead<ResolvedEvent<UserEvent>>,
  { userId, role }: UpdateUserRole,
): Promise<UserRoleChanged> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const user = await getUser(events);

  return {
    type: 'user-role-changed',
    data: {
      userId,
      role,
    },
  };
};
