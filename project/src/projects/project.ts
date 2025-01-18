import { StreamAggregator } from '#core/streams';
import {
  JSONEventType,
  ResolvedEvent,
  StreamingRead,
} from '@eventstore/db-client';

//////////////////////////////////////
/// Events
//////////////////////////////////////

export type ProjectCreated = JSONEventType<
  'project-created',
  {
    projectId: string;
    name: string;
    ownerId: string;
    taskBoardId: string;
  }
>;

export type ProjectRenamed = JSONEventType<
  'project-renamed',
  {
    projectId: string;
    name: string;
  }
>;

export type MemberAddedToProject = JSONEventType<
  'member-added',
  {
    projectId: string;
    memberId: string;
  }
>;

export type MemberRemovedFromProject = JSONEventType<
  'member-removed',
  {
    projectId: string;
    memberId: string;
  }
>;

export type ProjectEvent =
  | ProjectCreated
  | ProjectRenamed
  | MemberAddedToProject
  | MemberRemovedFromProject;

export const isProjectEvent = (event: unknown): event is ProjectEvent => {
  return (
    event != null &&
    ((event as ProjectEvent).type === 'project-created' ||
      (event as ProjectEvent).type === 'project-renamed' ||
      (event as ProjectEvent).type === 'member-added' ||
      (event as ProjectEvent).type === 'member-removed')
  );
};

//////////////////////////////////////
/// Entity/State
//////////////////////////////////////

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  taskBoardId: string;
  memberIds: string[];
}

export const toProjectStreamName = (projectId: string) =>
  `project-${projectId}`;

export const enum ProjectErrors {
  CREATED_EXISTING_PROJECT = 'CREATED_EXISTING_PROJECT',
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  UNKNOWN_EVENT_TYPE = 'UNKNOWN_EVENT_TYPE',
}

//////////////////////////////////////
/// Getting the state from events
//////////////////////////////////////

export const getProject = StreamAggregator<Project, ProjectEvent>(
  (currentState, event) => {
    if (event.type === 'project-created') {
      if (currentState != null) throw ProjectErrors.CREATED_EXISTING_PROJECT;
      return {
        id: event.data.projectId,
        name: event.data.name,
        ownerId: event.data.ownerId,
        taskBoardId: event.data.taskBoardId,
        memberIds: [],
      };
    }

    if (currentState == null) throw ProjectErrors.PROJECT_NOT_FOUND;

    switch (event.type) {
      case 'project-renamed':
        return {
          ...currentState,
          name: event.data.name,
        };
      case 'member-added':
        return {
          ...currentState,
          memberIds: [...currentState.memberIds, event.data.memberId],
        };
      case 'member-removed':
        return {
          ...currentState,
          memberIds: currentState.memberIds.filter(
            (memberId) => memberId === event.data.memberId,
          ),
        };
      default: {
        const _: never = event;
        throw ProjectErrors.UNKNOWN_EVENT_TYPE;
      }
    }
  },
);

//////////////////////////////////////
/// Create project
//////////////////////////////////////

export type CreateProject = {
  projectId: string;
  name: string;
  ownerId: string;
  taskBoardId: string;
};

export const createProject = ({
  projectId,
  name,
  ownerId,
  taskBoardId,
}: CreateProject): ProjectCreated => {
  return {
    type: 'project-created',
    data: {
      projectId,
      name,
      ownerId,
      taskBoardId,
    },
  };
};

//////////////////////////////////////
/// Rename project
//////////////////////////////////////

export type RenameProject = {
  projectId: string;
  name: string;
};

export const renameProject = async (
  events: StreamingRead<ResolvedEvent<ProjectEvent>>,
  { projectId, name }: RenameProject,
): Promise<ProjectRenamed> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const project = await getProject(events);

  return {
    type: 'project-renamed',
    data: {
      projectId,
      name,
    },
  };
};

//////////////////////////////////////
/// Add member to project
//////////////////////////////////////

export type AddMemberToProject = {
  projectId: string;
  memberId: string;
};

export const addMemberToProject = async (
  events: StreamingRead<ResolvedEvent<ProjectEvent>>,
  { projectId, memberId }: AddMemberToProject,
): Promise<MemberAddedToProject> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const project = await getProject(events);

  return {
    type: 'member-added',
    data: {
      projectId,
      memberId,
    },
  };
};

//////////////////////////////////////
/// Remove member from project
//////////////////////////////////////

export type RemoveMemberFromProject = {
  projectId: string;
  memberId: string;
};

export const removeMemberFromProject = async (
  events: StreamingRead<ResolvedEvent<ProjectEvent>>,
  { projectId, memberId }: RemoveMemberFromProject,
): Promise<MemberRemovedFromProject> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const project = await getProject(events);

  return {
    type: 'member-removed',
    data: {
      projectId,
      memberId,
    },
  };
};
