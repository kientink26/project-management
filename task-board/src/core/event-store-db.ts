import {
  ANY,
  AppendExpectedRevision,
  EventStoreDBClient,
  jsonEvent,
  NO_STREAM,
  StreamNotFoundError,
} from '@eventstore/db-client';
import { EventStore } from './event-store';

export class EventStoreDBEventStore implements EventStore {
  #client: EventStoreDBClient;
  private static instance: EventStoreDBEventStore;

  constructor({ connectionString }: { connectionString: string }) {
    this.#client = EventStoreDBClient.connectionString(connectionString);
  }

  public static getInstance(): EventStoreDBEventStore {
    if (!EventStoreDBEventStore.instance) {
      EventStoreDBEventStore.instance = new EventStoreDBEventStore({
        connectionString: process.env.EVENTSTORE_URI!,
      });
    }
    return EventStoreDBEventStore.instance;
  }

  async save(
    streamId: string,
    events: any[],
    {
      expectedVersion = ANY,
    }: { expectedVersion?: AppendExpectedRevision } = {},
  ) {
    if (expectedVersion === null) expectedVersion = NO_STREAM;
    const response = await this.#client.appendToStream(
      streamId,
      events.map(jsonEvent),
      { expectedRevision: expectedVersion },
    );
    if (!response.success) throw new Error('stream version mismatch');
  }

  async load(streamId: string, { startVersion = 0 } = {}) {
    try {
      const fromRevision = BigInt(startVersion);

      const events = [];
      const eventStream = this.#client.readStream(streamId, { fromRevision });
      for await (const { event } of eventStream) {
        if (!event) continue;
        events.push(event);
      }
      return {
        events,
        currentVersion:
          events.length > 0 ? events[events.length - 1].revision : null,
      };
    } catch (error) {
      if (!(error instanceof StreamNotFoundError)) throw error;
      return { events: [], currentVersion: null };
    }
  }
}
