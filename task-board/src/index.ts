import { startAPI } from 'src/task-boards/api';
import {
  SubscriptionToAllWithMongoCheckpoints,
  storeCheckpointInCollection,
} from '#core/mongoDB';
import { natsWrapper } from '#core/nats-wrapper';
import { MemberRemovedListener } from './listeners/member-removed-listener';
import { ProjectCreatedListener } from './listeners/project-created-listener';
import { router } from './task-boards/routes';
import { projectToTaskBoardReadModel } from './task-boards/taskBoardProjection';
import { EventStoreDBEventStore } from '#core/event-store-db';

//////////////////////////////////////
/// Run
//////////////////////////////////////
(async () => {
  await natsWrapper.connect(
    process.env.NATS_CLUSTER_ID!,
    process.env.NATS_CLIENT_ID!,
    process.env.NATS_URL!,
  );
  natsWrapper.client.on('close', () => {
    console.log('NATS connection closed!');
    process.exit();
  });
  process.on('SIGINT', () => natsWrapper.client.close());
  process.on('SIGTERM', () => natsWrapper.client.close());

  await delay(5000);

  await SubscriptionToAllWithMongoCheckpoints('sub_task_boards', [
    storeCheckpointInCollection(projectToTaskBoardReadModel),
  ]);

  startAPI(router);

  new ProjectCreatedListener({
    eventBus: natsWrapper.client,
    eventStore: EventStoreDBEventStore.getInstance(),
  }).listen();

  new MemberRemovedListener({
    eventBus: natsWrapper.client,
    eventStore: EventStoreDBEventStore.getInstance(),
  }).listen();
})().catch(console.log);

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
