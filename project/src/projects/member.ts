import { StreamAggregator } from '#core/streams';
import {
  JSONEventType,
  ResolvedEvent,
  StreamingRead,
} from '@eventstore/db-client';

//////////////////////////////////////
/// Events
//////////////////////////////////////

export type MemberCreated = JSONEventType<
  'member-created',
  {
    memberId: string;
    userId: string;
    role: string;
  }
>;

export type MemberRoleChanged = JSONEventType<
  'member-role-changed',
  {
    memberId: string;
    role: string;
  }
>;

export type MemberEvent = MemberCreated | MemberRoleChanged;

export const isMemberEvent = (event: unknown): event is MemberEvent => {
  return (
    event != null &&
    ((event as MemberEvent).type === 'member-created' ||
      (event as MemberEvent).type === 'member-role-changed')
  );
};

//////////////////////////////////////
/// Entity/State
//////////////////////////////////////

export interface Member {
  id: string;
  role: string;
  userId: string;
}

export const toMemberStreamName = (memberId: string) => `member-${memberId}`;

export const enum MemberErrors {
  CREATED_EXISTING_MEMBER = 'CREATED_EXISTING_MEMBER',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  UNKNOWN_EVENT_TYPE = 'UNKNOWN_EVENT_TYPE',
}

//////////////////////////////////////
/// Getting the state from events
//////////////////////////////////////

export const getMember = StreamAggregator<Member, MemberEvent>(
  (currentState, event) => {
    if (event.type === 'member-created') {
      if (currentState != null) throw MemberErrors.CREATED_EXISTING_MEMBER;
      return {
        id: event.data.memberId,
        role: event.data.role,
        userId: event.data.userId,
      };
    }

    if (currentState == null) throw MemberErrors.MEMBER_NOT_FOUND;

    switch (event.type) {
      case 'member-role-changed':
        return {
          ...currentState,
          role: event.data.role,
        };
      default: {
        const _: never = event;
        throw MemberErrors.UNKNOWN_EVENT_TYPE;
      }
    }
  },
);

//////////////////////////////////////
/// Create member
//////////////////////////////////////

export type CreateMember = {
  memberId: string;
  role: string;
  userId: string;
};

export const createMember = ({
  memberId,
  role,
  userId,
}: CreateMember): MemberCreated => {
  return {
    type: 'member-created',
    data: {
      memberId,
      role,
      userId,
    },
  };
};

//////////////////////////////////////
/// Update member role
//////////////////////////////////////

export type UpdateMemberRole = {
  memberId: string;
  role: string;
};

export const updateMemberRole = async (
  events: StreamingRead<ResolvedEvent<MemberEvent>>,
  { memberId, role }: UpdateMemberRole,
): Promise<MemberRoleChanged> => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const member = await getMember(events);

  return {
    type: 'member-role-changed',
    data: {
      memberId,
      role,
    },
  };
};
