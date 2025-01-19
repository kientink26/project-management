// User event

import { createEventType } from '#core/event-type-factory';

export const UserCreated = createEventType('user-created')<{
  userId: string;
  password: string;
  email: string;
  role: string;
}>();

export const UserRoleChanged = createEventType('user-role-changed')<{
  userId: string;
  role: string;
}>();

export type UserCreated = InstanceType<typeof UserCreated>;
export type UserRoleChanged = InstanceType<typeof UserRoleChanged>;

export type UserEvent = UserCreated | UserRoleChanged;

export const isUserEvent = (event: unknown): event is UserEvent => {
  return (
    event != null &&
    ((event as UserEvent).type === UserCreated.type ||
      (event as UserEvent).type === UserRoleChanged.type)
  );
};
