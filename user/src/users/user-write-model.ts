import { UserCreated, UserEvent, UserRoleChanged } from './events';

type State = {
  id: string;
  password: string;
  email: string;
  role: string;
};

export const initialUserState = {
  id: '',
  password: '',
  email: '',
  role: '',
};

export const toUserStreamName = (userId: string) => `user-${userId}`;

export const applyUserEvents = (state: State, events: UserEvent[]) =>
  events.reduce(applyEvent, state);

const applyEvent = (state: State, event: UserEvent): State => {
  if (event.type === UserCreated.type) {
    return {
      id: event.data.userId,
      role: event.data.role,
      password: event.data.password,
      email: event.data.email,
    };
  }

  switch (event.type) {
    case UserRoleChanged.type:
      return {
        ...state,
        role: event.data.role,
      };
  }

  return { ...state };
};

type CreateUserArgs = {
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
}: CreateUserArgs) => {
  return [new UserCreated({ userId, role, password, email })];
};

export const updateUserRole = (state: State, role: string) => {
  return [new UserRoleChanged({ userId: state.id, role })];
};
