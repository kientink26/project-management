import { Listener } from '#core/base-listener';
import { ProjectCreatedEvent } from '#core/project-created-event';
import { Subjects } from '#core/subjects';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import { EventStore } from '#core/event-store';
import {
  createTaskBoard,
  toTaskBoardStreamName,
} from 'src/task-boards/task-board-write-model';

export class ProjectCreatedListener extends Listener<ProjectCreatedEvent> {
  eventStore: EventStore;
  subject: Subjects.ProjectCreated = Subjects.ProjectCreated;
  queueGroupName = queueGroupName;

  constructor({
    eventStore,
    eventBus,
  }: {
    eventStore: EventStore;
    eventBus: any;
  }) {
    super(eventBus);
    this.eventStore = eventStore;
  }

  async onMessage(data: ProjectCreatedEvent['data'], msg: Message) {
    const streamName = toTaskBoardStreamName(data.taskBoardId);

    await this.eventStore.save(streamName, createTaskBoard(data.taskBoardId), {
      expectedVersion: null,
    });

    msg.ack();
  }
}
