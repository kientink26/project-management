import {
  getMongoCollection,
  retryIfNotFound,
  retryIfNotUpdated,
  toObjectId,
} from '../core/mongoDB';
import { SubscriptionResolvedEvent } from '../core/subscriptions';
import { isUserEvent, UserCreated, UserRoleChanged } from './user';

//////////////////////////////////////
/// User Read Model projection
//////////////////////////////////////

export const getUsersCollection = () => getMongoCollection<User>('users');

type User = Readonly<{
  userId: string;
  password: string;
  email: string;
  role: string;
  revision: number;
}>;

export const projectToUserReadModel = (
  resolvedEvent: SubscriptionResolvedEvent,
): Promise<void> => {
  if (resolvedEvent.event === undefined || !isUserEvent(resolvedEvent.event))
    return Promise.resolve();

  const { event } = resolvedEvent;
  const streamRevision = Number(event.revision);

  switch (event.type) {
    case 'user-created':
      return userCreated(event, streamRevision);
    case 'user-role-changed':
      return userRoleChanged(event, streamRevision);
    default:
      return Promise.resolve();
  }
};

export const userCreated = async (
  event: UserCreated,
  streamRevision: number,
): Promise<void> => {
  const users = await getUsersCollection();

  const { userId, role, password, email } = event.data;

  await users.insertOne({
    _id: toObjectId(userId),
    userId,
    email,
    password,
    role,
    revision: streamRevision,
  });
};

export const userRoleChanged = async (
  event: UserRoleChanged,
  streamRevision: number,
): Promise<void> => {
  const users = await getUsersCollection();
  const lastRevision = streamRevision - 1;

  const { revision } = await retryIfNotFound(() =>
    users.findOne(
      {
        _id: toObjectId(event.data.userId),
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
    users.updateOne(
      {
        _id: toObjectId(event.data.userId),
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
