import { SubscriptionResolvedEvent } from '../core/subscriptions';
import { isProjectEvent } from './events';
import { isMemberEvent } from './events';
import { AllStreamRecordedEvent } from '@eventstore/db-client';
import { natsWrapper } from '#core/nats-wrapper';

//////////////////////////////////////
/// Public event publisher
//////////////////////////////////////

export const publicEventPublisher = (
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
    case 'member-removed':
      return publishEvent(event);
    default:
      return Promise.resolve();
  }
};

export const publishEvent = async (
  event: AllStreamRecordedEvent,
): Promise<void> => {
  natsWrapper.client.publish(event.type, JSON.stringify(event.data), (err) => {
    if (err) {
      return console.log(err);
    }
    console.log('Event published to subject', event.type);
  });
};
