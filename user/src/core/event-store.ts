export interface EventStore {
  save(
    streamName: string,
    events: any[],
    options?: { expectedVersion: any },
  ): Promise<void>;

  load(streamName: string): Promise<{ events: any[]; currentVersion: any }>;
}
