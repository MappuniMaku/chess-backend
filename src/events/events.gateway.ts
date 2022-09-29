import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

import {
  LOCALHOST_FRONTEND_ADDRESS,
  PRODUCTION_FRONTEND_ADDRESS,
} from '../constants';
import { WsEvents } from './constants';
import { User } from '../users/schemas';

@WebSocketGateway({
  transports: ['websocket'],
  cors:
    process.env.NODE_ENV === 'development'
      ? LOCALHOST_FRONTEND_ADDRESS
      : PRODUCTION_FRONTEND_ADDRESS,
})
export class EventsGateway {
  connectedClients: { socket: Socket; user?: User }[] = [];

  getAuthenticatedUsers(): User[] {
    return this.connectedClients
      .map(({ user }) => user)
      .filter((u) => u !== undefined) as User[];
  }

  sendMessageToClient = (socketId: string, event: WsEvents, data: unknown) => {
    const targetUser = this.connectedClients.find(
      ({ socket }) => socket.id === socketId,
    );
    targetUser?.socket.emit(event, data);
  };

  sendMessageToAllClients(event: WsEvents, data: unknown): void {
    this.connectedClients.forEach(({ socket }) => {
      socket.emit(event, data);
    });
  }

  sendMessageToAllClientsExceptOne(
    excludedSocketId: string,
    event: WsEvents,
    data: unknown,
  ): void {
    this.connectedClients.forEach(({ socket }) => {
      if (socket.id !== excludedSocketId) {
        socket.emit(event, data);
      }
    });
  }

  @SubscribeMessage(WsEvents.CONNECT)
  handleConnection(@ConnectedSocket() client: Socket): void {
    this.connectedClients.push({ socket: client });
  }

  @SubscribeMessage(WsEvents.JOIN)
  userJoined(
    @MessageBody('user') user: User | undefined,
    @ConnectedSocket() client: Socket,
  ): WsResponse<User[]> {
    const newUser = { socket: client, user };
    const clientIndex = this.connectedClients.findIndex(
      ({ socket }) => socket.id === client.id,
    );
    const isUserAlreadyConnected = clientIndex !== -1;
    if (isUserAlreadyConnected) {
      this.connectedClients[clientIndex] = newUser;
    } else {
      this.connectedClients.push(newUser);
    }
    const authenticatedUsers = this.getAuthenticatedUsers();
    if (user !== undefined) {
      this.sendMessageToAllClientsExceptOne(
        client.id,
        WsEvents.UPDATE_LOBBY,
        authenticatedUsers,
      );
    }
    return {
      event: WsEvents.UPDATE_LOBBY,
      data: authenticatedUsers,
    };
  }

  @SubscribeMessage(WsEvents.DISCONNECT)
  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const targetClient = this.connectedClients.find(
      ({ socket }) => socket.id === client.id,
    );
    this.connectedClients = this.connectedClients.filter(
      ({ socket }) => socket.id !== client.id,
    );
    if (targetClient?.user === undefined) {
      return;
    }
    this.sendMessageToAllClients(
      WsEvents.UPDATE_LOBBY,
      this.getAuthenticatedUsers(),
    );
  }
}
