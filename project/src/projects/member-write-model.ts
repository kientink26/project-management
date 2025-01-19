import { MemberCreated, MemberEvent, MemberRoleChanged } from './events';

type State = {
  id: string;
  role: string;
  userId: string;
};

export const initialMemberState = {
  id: '',
  role: '',
  userId: '',
};

export const toMemberStreamName = (memberId: string) => `member-${memberId}`;

export const applyMemberEvents = (state: State, events: MemberEvent[]) =>
  events.reduce(applyEvent, state);

const applyEvent = (state: State, event: MemberEvent): State => {
  if (event.type === MemberCreated.type) {
    return {
      id: event.data.memberId,
      role: event.data.role,
      userId: event.data.userId,
    };
  }

  switch (event.type) {
    case MemberRoleChanged.type:
      return {
        ...state,
        role: event.data.role,
      };
  }

  return { ...state };
};

type CreateMemberArgs = {
  memberId: string;
  role: string;
  userId: string;
};

export const createMember = ({ memberId, role, userId }: CreateMemberArgs) => {
  return [new MemberCreated({ memberId, role, userId })];
};

export const updateMemberRole = (state: State, role: string) => {
  return [new MemberRoleChanged({ memberId: state.id, role })];
};
