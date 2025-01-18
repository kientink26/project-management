import { Listener } from '#core/base-listener';
import { Subjects } from '#core/subjects';
import { Message } from 'node-nats-streaming';
import { queueGroupName } from './queue-group-name';
import { MemberRemovedFromProjectEvent } from '#core/member-removed-event';
import { getTasksCollection } from 'src/task-boards/taskBoardProjection';
import {
  getTask,
  TaskStatus,
  toTaskStreamName,
  updateTaskAssignee,
  updateTaskStatus,
} from 'src/task-boards/task';
import { getEventStore } from '#core/streams';
import { jsonEvent } from '@eventstore/db-client';

export class MemberRemovedListener extends Listener<MemberRemovedFromProjectEvent> {
  subject: Subjects.MemberRemovedFromProject =
    Subjects.MemberRemovedFromProject;
  queueGroupName = queueGroupName;

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
        const readStream = getEventStore().readStream(streamName);
        const task = await getTask(readStream);

        const eventsToAdd = [];

        try {
          if (task.status === TaskStatus.IN_PROGRESS) {
            eventsToAdd.push(
              await updateTaskStatus(getEventStore().readStream(streamName), {
                taskId,
                status: TaskStatus.TODO,
              }),
            );
          }
          eventsToAdd.push(
            await updateTaskAssignee(getEventStore().readStream(streamName), {
              taskId,
              assigneeId: undefined,
            }),
          );
        } catch (e) {
          console.log(e);
        }

        return getEventStore().appendToStream(
          streamName,
          eventsToAdd.map((ev) => jsonEvent(ev)),
        );
      }),
    );

    msg.ack();
  }
}
