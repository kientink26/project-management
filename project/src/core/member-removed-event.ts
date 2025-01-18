import { Subjects } from './subjects';

export interface MemberRemovedFromProjectEvent {
  subject: Subjects.MemberRemovedFromProject;
  data: {
    projectId: string;
    memberId: string;
  };
}
