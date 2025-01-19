import { EventStore } from '#core/event-store';
import { createMessageForwarder } from '#core/message-forwarder';
import { Password } from 'src/utils/password';
import {
  CreateUserCommand,
  LoginUserCommand,
  UpdateUserRoleCommand,
} from './command';
import {
  applyUserEvents,
  createUser,
  initialUserState,
  toUserStreamName,
  updateUserRole,
} from './user-write-model';

export class CommandHandlers {
  #eventStore: EventStore;

  constructor({ eventStore }: { eventStore: EventStore }) {
    this.#eventStore = eventStore;
  }

  handleCommand = createMessageForwarder(this, { messageSuffix: 'Command' });

  async handleCreateUserCommand({ data }: CreateUserCommand) {
    const { userId, role, password, email } = data;
    const hashedPassword = await Password.toHash(password);
    const events = createUser({
      userId,
      role,
      email,
      password: hashedPassword,
    });
    await this.#eventStore.save(toUserStreamName(userId), events, {
      expectedVersion: null,
    });
  }

  async handleLoginUserCommand({
    data: { userId, password },
  }: LoginUserCommand) {
    const streamName = toUserStreamName(userId);
    const { events } = await this.#eventStore.load(streamName);
    if (events.length === 0) {
      throw new Error('not found');
    }
    const state = applyUserEvents(initialUserState, events);
    const match = await Password.compare(state.password, password);
    if (!match) throw new Error('invalid credential');
  }

  async handleUpdateUserRoleCommand({
    data: { userId, role },
  }: UpdateUserRoleCommand) {
    const streamName = toUserStreamName(userId);

    const { events, currentVersion } = await this.#eventStore.load(streamName);
    if (events.length === 0) {
      throw new Error('not found');
    }
    const newEvents = updateUserRole(
      applyUserEvents(initialUserState, events),
      role,
    );
    await this.#eventStore.save(streamName, newEvents, {
      expectedVersion: currentVersion,
    });
  }
}
