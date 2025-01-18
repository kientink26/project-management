import { startAPI } from '#core/api';
import {
  SubscriptionToAllWithMongoCheckpoints,
  storeCheckpointInCollection,
} from '#core/mongoDB';
import { natsWrapper } from '#core/nats-wrapper';
import { projectToProjectReadModel } from './projects/projectProjection';
import { publicEventPublisher } from './projects/publicEventPublisher';
import { router } from './projects/routes';

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

  await SubscriptionToAllWithMongoCheckpoints('sub_projects', [
    storeCheckpointInCollection(projectToProjectReadModel),
  ]);

  await SubscriptionToAllWithMongoCheckpoints('sub_event_publisher', [
    storeCheckpointInCollection(publicEventPublisher),
  ]);

  startAPI(router);
})().catch(console.log);

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
