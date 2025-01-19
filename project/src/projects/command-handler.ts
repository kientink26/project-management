import { EventStore } from '#core/event-store';
import { createMessageForwarder } from '#core/message-forwarder';
import {
  AddMemberToProjectCommand,
  CreateProjectCommand,
  RemoveMemberFromProjectCommand,
  UpdateMemberRoleCommand,
  UpdateProjectNameCommand,
} from './commands';
import {
  applyMemberEvents,
  createMember,
  initialMemberState,
  toMemberStreamName,
  updateMemberRole,
} from './member-write-model';
import {
  addMemberToProject,
  applyProjectEvents,
  createProject,
  initialProjectState,
  removeMemberFromProject,
  renameProject,
  toProjectStreamName,
} from './project-write-model';

export class CommandHandlers {
  #eventStore: EventStore;

  constructor({ eventStore }: { eventStore: EventStore }) {
    this.#eventStore = eventStore;
  }

  handleCommand = createMessageForwarder(this, { messageSuffix: 'Command' });

  async handleCreateProjectCommand({ data }: CreateProjectCommand) {
    const { projectId, name, ownerId, taskBoardId } = data;
    const events = createProject({ projectId, name, ownerId, taskBoardId });
    await this.#eventStore.save(toProjectStreamName(projectId), events, {
      expectedVersion: null,
    });
  }

  async handleUpdateProjectNameCommand({
    data: { projectId, name },
  }: UpdateProjectNameCommand) {
    const streamName = toProjectStreamName(projectId);

    const { events, currentVersion } = await this.#eventStore.load(streamName);
    const newEvents = renameProject(
      applyProjectEvents(initialProjectState, events),
      name,
    );
    await this.#eventStore.save(streamName, newEvents, {
      expectedVersion: currentVersion,
    });
  }

  async handleAddMemberToProjectCommand(command: AddMemberToProjectCommand) {
    const {
      data: { projectId, memberId, userId, role },
    } = command;
    const memberStreamName = toMemberStreamName(memberId);
    const memberEvents = createMember({ memberId, userId, role });
    await this.#eventStore.save(memberStreamName, memberEvents);

    const projectStreamName = toProjectStreamName(projectId);
    const { events, currentVersion } =
      await this.#eventStore.load(projectStreamName);

    const newProjectEvents = addMemberToProject(
      applyProjectEvents(initialProjectState, events),
      memberId,
    );
    await this.#eventStore.save(projectStreamName, newProjectEvents, {
      expectedVersion: currentVersion,
    });
  }

  async handleRemoveMemberFromProjectCommand(
    command: RemoveMemberFromProjectCommand,
  ) {
    const {
      data: { projectId, memberId },
    } = command;
    const projectStreamName = toProjectStreamName(projectId);
    const { events, currentVersion } =
      await this.#eventStore.load(projectStreamName);

    const newProjectEvents = removeMemberFromProject(
      applyProjectEvents(initialProjectState, events),
      memberId,
    );
    await this.#eventStore.save(projectStreamName, newProjectEvents, {
      expectedVersion: currentVersion,
    });
  }

  async handleUpdateMemberRoleCommand({
    data: { memberId, role },
  }: UpdateMemberRoleCommand) {
    const streamName = toMemberStreamName(memberId);

    const { events, currentVersion } = await this.#eventStore.load(streamName);
    const newEvents = updateMemberRole(
      applyMemberEvents(initialMemberState, events),
      role,
    );
    await this.#eventStore.save(streamName, newEvents, {
      expectedVersion: currentVersion,
    });
  }
}
