import { createMessageType } from '#core/message-type-factory';

export const CreateUserCommand = createMessageType('CreateUser')<{
  userId: string;
  password: string;
  email: string;
  role: string;
}>();

export const LoginUserCommand = createMessageType('LoginUser')<{
  userId: string;
  password: string;
}>();

export const UpdateUserRoleCommand = createMessageType('UpdateUserRole')<{
  userId: string;
  role: string;
}>();

export type CreateUserCommand = InstanceType<typeof CreateUserCommand>;
export type LoginUserCommand = InstanceType<typeof LoginUserCommand>;
export type UpdateUserRoleCommand = InstanceType<typeof UpdateUserRoleCommand>;
