import { startAPI } from '#core/api';
import {
  SubscriptionToAllWithMongoCheckpoints,
  storeCheckpointInCollection,
} from '#core/mongoDB';
import { natsWrapper } from '#core/nats-wrapper';
import { MemberRemovedListener } from './listeners/member-removed-listener';
import { ProjectCreatedListener } from './listeners/project-created-listener';
import { router } from './task-boards/routes';
import { projectToTaskBoardReadModel } from './task-boards/taskBoardProjection';

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

  new ProjectCreatedListener(natsWrapper.client).listen();
  new MemberRemovedListener(natsWrapper.client).listen();

  await delay(5000);

  await SubscriptionToAllWithMongoCheckpoints('sub_task_boards', [
    storeCheckpointInCollection(projectToTaskBoardReadModel),
  ]);

  startAPI(router);
})().catch(console.log);

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
