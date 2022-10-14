import { Socket } from 'socket.io';

import { User } from '../users/schemas';

export interface IConnectedClient {
  socket: Socket;
  user?: User;
}

export type IWsEventData = Record<string, unknown>;
