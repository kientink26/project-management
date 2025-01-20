export const createMessageForwarder =
  (target: any, { messageSuffix } = { messageSuffix: '' }) =>
  (message: any) => {
    const messageHandlerName = `handle${message.type}${messageSuffix}`;

    if (!target[messageHandlerName])
      throw new Error(`invalid message: ${JSON.stringify(message)}`);

    return target[messageHandlerName](message);
  };
