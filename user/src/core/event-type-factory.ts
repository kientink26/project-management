import { v4 as uuid } from 'uuid';

export const createEventType =
  <TypeName extends string>(type: TypeName) =>
  <Data>() => {
    return class Event {
      static readonly type: TypeName = type;
      readonly type = type;
      readonly id = uuid();
      readonly metadata = { creationTime: new Date() };

      constructor(readonly data: Data) {}
    };
  };
