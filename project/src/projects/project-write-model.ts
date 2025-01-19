import {
  MemberAddedToProject,
  MemberRemovedFromProject,
  ProjectCreated,
  ProjectEvent,
  ProjectRenamed,
} from './events';

type State = {
  id: string;
  name: string;
  ownerId: string;
  taskBoardId: string;
  memberIds: string[];
};

export const initialProjectState = {
  id: '',
  name: '',
  ownerId: '',
  taskBoardId: '',
  memberIds: [],
};

export const toProjectStreamName = (projectId: string) =>
  `project-${projectId}`;

export const applyProjectEvents = (state: State, events: ProjectEvent[]) =>
  events.reduce(applyEvent, state);

const applyEvent = (state: State, event: ProjectEvent): State => {
  if (event.type === ProjectCreated.type) {
    return {
      id: event.data.projectId,
      name: event.data.name,
      ownerId: event.data.ownerId,
      taskBoardId: event.data.taskBoardId,
      memberIds: [],
    };
  }

  switch (event.type) {
    case ProjectRenamed.type:
      return {
        ...state,
        name: event.data.name,
      };
    case MemberAddedToProject.type:
      return {
        ...state,
        memberIds: [...state.memberIds, event.data.memberId],
      };
    case MemberRemovedFromProject.type:
      return {
        ...state,
        memberIds: state.memberIds.filter(
          (memberId) => memberId === event.data.memberId,
        ),
      };
  }

  return { ...state };
};

type CreateProjectArgs = {
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
}: CreateProjectArgs) => {
  return [new ProjectCreated({ projectId, name, ownerId, taskBoardId })];
};

export const renameProject = (state: State, name: string) => {
  return [new ProjectRenamed({ projectId: state.id, name })];
};

export const addMemberToProject = (state: State, memberId: string) => {
  return [new MemberAddedToProject({ projectId: state.id, memberId })];
};

export const removeMemberFromProject = (state: State, memberId: string) => {
  const indexToRemove = state.memberIds.indexOf(memberId);
  if (indexToRemove === -1) {
    return [];
  }
  return [new MemberRemovedFromProject({ projectId: state.id, memberId })];
};
