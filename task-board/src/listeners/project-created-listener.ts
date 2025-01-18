import { Listener } from '#core/base-listener';
import { ProjectCreatedEvent } from '#core/project-created-event';
import { Subjects } from '#core/subjects';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import {
  createTaskBoard,
  toTaskBoardStreamName,
} from 'src/task-boards/taskBoard';
import { getEventStore } from '#core/streams';
import { create } from '#core/commandHandling';

export class ProjectCreatedListener extends Listener<ProjectCreatedEvent> {
  subject: Subjects.ProjectCreated = Subjects.ProjectCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: ProjectCreatedEvent['data'], msg: Message) {
    const streamName = toTaskBoardStreamName(data.taskBoardId);

    await create(getEventStore(), createTaskBoard)(streamName, {
      taskBoardId: data.taskBoardId,
    });
    msg.ack();
  }
}
