import { createEventType } from '#core/event-type-factory';

// Project event

export const ProjectCreated = createEventType('project-created')<{
  projectId: string;
  name: string;
  ownerId: string;
  taskBoardId: string;
}>();

export const ProjectRenamed = createEventType('project-renamed')<{
  projectId: string;
  name: string;
}>();

export const MemberAddedToProject = createEventType('member-added')<{
  projectId: string;
  memberId: string;
}>();

export const MemberRemovedFromProject = createEventType('member-removed')<{
  projectId: string;
  memberId: string;
}>();

export type ProjectCreated = InstanceType<typeof ProjectCreated>;
export type ProjectRenamed = InstanceType<typeof ProjectRenamed>;
export type MemberAddedToProject = InstanceType<typeof MemberAddedToProject>;
export type MemberRemovedFromProject = InstanceType<
  typeof MemberRemovedFromProject
>;

export type ProjectEvent =
  | ProjectCreated
  | ProjectRenamed
  | MemberAddedToProject
  | MemberRemovedFromProject;

export const isProjectEvent = (event: unknown): event is ProjectEvent => {
  return (
    event != null &&
    ((event as ProjectEvent).type === ProjectCreated.type ||
      (event as ProjectEvent).type === ProjectRenamed.type ||
      (event as ProjectEvent).type === MemberAddedToProject.type ||
      (event as ProjectEvent).type === MemberRemovedFromProject.type)
  );
};

// Member event

export const MemberCreated = createEventType('member-created')<{
  memberId: string;
  userId: string;
  role: string;
}>();

export const MemberRoleChanged = createEventType('member-role-changed')<{
  memberId: string;
  role: string;
}>();

export type MemberCreated = InstanceType<typeof MemberCreated>;
export type MemberRoleChanged = InstanceType<typeof MemberRoleChanged>;

export type MemberEvent = MemberCreated | MemberRoleChanged;

export const isMemberEvent = (event: unknown): event is MemberEvent => {
  return (
    event != null &&
    ((event as MemberEvent).type === MemberCreated.type ||
      (event as MemberEvent).type === MemberRoleChanged.type)
  );
};
