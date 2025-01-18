import { startAPI } from 'src/users/api';
import {
  SubscriptionToAllWithMongoCheckpoints,
  storeCheckpointInCollection,
} from '#core/mongoDB';
import { natsWrapper } from '#core/nats-wrapper';
import { router } from './users/routes';
import { projectToUserReadModel } from './users/userProjection';

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

  await SubscriptionToAllWithMongoCheckpoints('sub_users', [
    storeCheckpointInCollection(projectToUserReadModel),
  ]);

  startAPI(router);
})().catch(console.log);

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
