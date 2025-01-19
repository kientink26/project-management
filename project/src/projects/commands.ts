import { createMessageType } from '#core/message-type-factory';

export const CreateProjectCommand = createMessageType('CreateProject')<{
  name: string;
  projectId: string;
  ownerId: string;
  taskBoardId: string;
}>();

export const UpdateProjectNameCommand = createMessageType('UpdateProjectName')<{
  projectId: string;
  name: string;
}>();

export const AddMemberToProjectCommand = createMessageType(
  'AddMemberToProject',
)<{
  projectId: string;
  memberId: string;
  userId: string;
  role: string;
}>();

export const RemoveMemberFromProjectCommand = createMessageType(
  'RemoveMemberFromProject',
)<{
  projectId: string;
  memberId: string;
}>();

export const UpdateMemberRoleCommand = createMessageType('UpdateMemberRole')<{
  memberId: string;
  role: string;
}>();

export type CreateProjectCommand = InstanceType<typeof CreateProjectCommand>;
export type UpdateProjectNameCommand = InstanceType<
  typeof UpdateProjectNameCommand
>;
export type AddMemberToProjectCommand = InstanceType<
  typeof AddMemberToProjectCommand
>;
export type RemoveMemberFromProjectCommand = InstanceType<
  typeof RemoveMemberFromProjectCommand
>;
export type UpdateMemberRoleCommand = InstanceType<
  typeof UpdateMemberRoleCommand
>;

export type ProjectCommand =
  | CreateProjectCommand
  | UpdateProjectNameCommand
  | AddMemberToProjectCommand
  | RemoveMemberFromProjectCommand;

export type MemberCommand = UpdateMemberRoleCommand;
