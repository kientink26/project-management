import { Subjects } from './subjects';

export interface ProjectCreatedEvent {
  subject: Subjects.ProjectCreated;
  data: {
    projectId: string;
    taskBoardId: string;
  };
}
