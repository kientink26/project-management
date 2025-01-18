import {
  getMongoCollection,
  retryIfNotFound,
  retryIfNotUpdated,
  toObjectId,
} from '../core/mongoDB';
import { SubscriptionResolvedEvent } from '../core/subscriptions';
import {
  isProjectEvent,
  MemberAddedToProject,
  MemberRemovedFromProject,
  ProjectCreated,
  ProjectRenamed,
} from './project';
import { isMemberEvent, MemberCreated, MemberRoleChanged } from './member';

//////////////////////////////////////
/// Project Read Model projection
//////////////////////////////////////

export const getProjectsCollection = () =>
  getMongoCollection<Project>('projects');

export const getMembersCollection = () => getMongoCollection<Member>('members');

type Project = Readonly<{
  projectId: string;
  name: string;
  ownerId: string;
  taskBoardId: string;
  totalMembersCount: number;
  revision: number;
}>;

type Member = Readonly<{
  memberId: string;
  role: string;
  userId: string;
  projectId?: string;
  revision: number;
}>;

export const projectToProjectReadModel = (
  resolvedEvent: SubscriptionResolvedEvent,
): Promise<void> => {
  if (
    resolvedEvent.event === undefined ||
    !(isProjectEvent(resolvedEvent.event) || isMemberEvent(resolvedEvent.event))
  )
    return Promise.resolve();

  const { event } = resolvedEvent;
  const streamRevision = Number(event.revision);

  switch (event.type) {
    case 'project-created':
      return projectCreated(event, streamRevision);
    case 'project-renamed':
      return projectRenamed(event, streamRevision);
    case 'member-created':
      return memberCreated(event, streamRevision);
    case 'member-added':
      return memberAdded(event, streamRevision);
    case 'member-removed':
      return memberRemoved(event, streamRevision);
    case 'member-role-changed':
      return membeRoleChanged(event, streamRevision);
    default:
      return Promise.resolve();
  }
};

export const memberCreated = async (
  event: MemberCreated,
  streamRevision: number,
): Promise<void> => {
  const members = await getMembersCollection();

  const { memberId, userId, role } = event.data;

  await members.insertOne({
    _id: toObjectId(memberId),
    memberId,
    userId,
    role,
    revision: streamRevision,
  });
};

export const memberAdded = async (
  event: MemberAddedToProject,
  streamRevision: number,
): Promise<void> => {
  const projects = await getProjectsCollection();
  const lastRevision = streamRevision - 1;

  const { revision } = await retryIfNotFound(() =>
    projects.findOne(
      {
        _id: toObjectId(event.data.projectId),
        revision: { $gte: lastRevision },
      },
      {
        projection: { revision: 1 },
      },
    ),
  );

  if (revision > lastRevision) {
    return;
  }

  await retryIfNotUpdated(() =>
    projects.updateOne(
      {
        _id: toObjectId(event.data.projectId),
        revision: lastRevision,
      },
      {
        $inc: {
          totalMembersCount: 1,
        },
        $set: {
          revision: streamRevision,
        },
      },
      { upsert: false },
    ),
  );

  const members = await getMembersCollection();

  await retryIfNotUpdated(() =>
    members.updateOne(
      {
        _id: toObjectId(event.data.memberId),
      },
      {
        $set: {
          projectId: event.data.projectId,
        },
      },
      { upsert: false },
    ),
  );
};

export const memberRemoved = async (
  event: MemberRemovedFromProject,
  streamRevision: number,
): Promise<void> => {
  const projects = await getProjectsCollection();
  const lastRevision = streamRevision - 1;

  const { revision } = await retryIfNotFound(() =>
    projects.findOne(
      {
        _id: toObjectId(event.data.projectId),
        revision: { $gte: lastRevision },
      },
      {
        projection: { revision: 1 },
      },
    ),
  );

  if (revision > lastRevision) {
    return;
  }

  await retryIfNotUpdated(() =>
    projects.updateOne(
      {
        _id: toObjectId(event.data.projectId),
        revision: lastRevision,
      },
      {
        $inc: {
          totalMembersCount: -1,
        },
        $set: {
          revision: streamRevision,
        },
      },
      { upsert: false },
    ),
  );

  const members = await getMembersCollection();
  await retryIfNotUpdated(() =>
    members.updateOne(
      {
        _id: toObjectId(event.data.memberId),
      },
      {
        $set: {
          projectId: undefined,
        },
      },
      { upsert: false },
    ),
  );
};

export const membeRoleChanged = async (
  event: MemberRoleChanged,
  streamRevision: number,
): Promise<void> => {
  const members = await getMembersCollection();
  const lastRevision = streamRevision - 1;

  const { revision } = await retryIfNotFound(() =>
    members.findOne(
      {
        _id: toObjectId(event.data.memberId),
        revision: { $gte: lastRevision },
      },
      {
        projection: { revision: 1 },
      },
    ),
  );

  if (revision > lastRevision) {
    return;
  }

  await retryIfNotUpdated(() =>
    members.updateOne(
      {
        _id: toObjectId(event.data.memberId),
        revision: lastRevision,
      },
      {
        $set: {
          role: event.data.role,
          revision: streamRevision,
        },
      },
      { upsert: false },
    ),
  );
};

export const projectCreated = async (
  event: ProjectCreated,
  streamRevision: number,
): Promise<void> => {
  const projects = await getProjectsCollection();

  const { projectId, name, ownerId, taskBoardId } = event.data;

  await projects.insertOne({
    _id: toObjectId(projectId),
    projectId,
    name,
    ownerId,
    taskBoardId,
    revision: streamRevision,
    totalMembersCount: 0,
  });
};

export const projectRenamed = async (
  event: ProjectRenamed,
  streamRevision: number,
): Promise<void> => {
  const projects = await getProjectsCollection();
  const lastRevision = streamRevision - 1;

  const { revision } = await retryIfNotFound(() =>
    projects.findOne(
      {
        _id: toObjectId(event.data.projectId),
        revision: { $gte: lastRevision },
      },
      {
        projection: { revision: 1 },
      },
    ),
  );

  if (revision > lastRevision) {
    return;
  }

  await retryIfNotUpdated(() =>
    projects.updateOne(
      {
        _id: toObjectId(event.data.projectId),
        revision: lastRevision,
      },
      {
        $set: {
          name: event.data.name,
          revision: streamRevision,
        },
      },
      { upsert: false },
    ),
  );
};
