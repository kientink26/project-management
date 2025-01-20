import { Listener } from '#core/base-listener';
import { Subjects } from '#core/subjects';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import { MemberRemovedFromProjectEvent } from '#core/member-removed-event';
import { getTasksCollection } from 'src/task-boards/taskBoardProjection';
import { EventStore } from '#core/event-store';
import {
  applyTaskEvents,
  initialTaskState,
  TaskStatus,
  toTaskStreamName,
  updateTaskAssignee,
  updateTaskStatus,
} from 'src/task-boards/task-write-model';

export class MemberRemovedListener extends Listener<MemberRemovedFromProjectEvent> {
  eventStore: EventStore;
  subject: Subjects.MemberRemovedFromProject =
    Subjects.MemberRemovedFromProject;
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

  async onMessage(data: MemberRemovedFromProjectEvent['data'], msg: Message) {
    const { memberId } = data;
    const tasks = await getTasksCollection();

    const taskAssignees = await tasks
      .find({
        assigneeId: memberId,
      })
      .toArray();

    await Promise.all(
      taskAssignees.map(async ({ taskId }) => {
        const streamName = toTaskStreamName(taskId);
        const { events, currentVersion } =
          await this.eventStore.load(streamName);

        const taskState = applyTaskEvents(initialTaskState, events);
        const statusEvents =
          taskState.status === TaskStatus.IN_PROGRESS
            ? updateTaskStatus(taskState, TaskStatus.TODO)
            : [];

        const updatedTaskState = applyTaskEvents(taskState, statusEvents);
        const assigneeEvents = updateTaskAssignee(updatedTaskState, undefined);

        await this.eventStore.save(
          streamName,
          [...statusEvents, ...assigneeEvents],
          { expectedVersion: currentVersion },
        );
      }),
    );

    msg.ack();
  }
}
