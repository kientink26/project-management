import { v4 as uuid } from 'uuid';

type Metadata = Record<string, object>;

let createDefaultMetadata = () => ({ creationTime: new Date() });

export const createMessageType =
  <TypeName extends string>(type: TypeName) =>
  <Data>() => {
    return class Message {
      static readonly type: TypeName = type;
      readonly type = type;
      readonly data: Data;
      readonly id = uuid();
      readonly metadata: Metadata;

      constructor({
        data,
        metadata = {},
      }: {
        data: Data;
        metadata?: Metadata;
      }) {
        this.data = data;
        this.metadata = { ...createDefaultMetadata(), ...metadata };
      }
    };
  };
