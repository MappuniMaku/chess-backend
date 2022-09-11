import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsResponse,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

import {
  LOCALHOST_FRONTEND_ADDRESS,
  PRODUCTION_FRONTEND_ADDRESS,
} from '../constants';
import { EVENTS } from './constants';
import { User } from '../users/schemas';

@WebSocketGateway({
  transports: ['websocket'],
  cors:
    process.env.NODE_ENV === 'development'
      ? LOCALHOST_FRONTEND_ADDRESS
      : PRODUCTION_FRONTEND_ADDRESS,
})
export class EventsGateway {
  @WebSocketServer() private server;
  connectedUsers: { socket: Socket; user: User }[] = [];

  sendMessageToUser = (username: string, event: string, data: unknown) => {
    const user = this.connectedUsers.find((u) => u.user.username === username);
    if (user === undefined) {
      throw new Error(
        `sendMessageToUser(): User with username ${username} not found`,
      );
    }
    user.socket.emit(event, data);
  };

  sendMessageToAllUsers(event: string, data: unknown): void {
    this.connectedUsers.forEach(({ socket }) => {
      socket.emit(event, data);
    });
  }

  sendMessageToAllUsersExceptOne(
    excludedUsername: string,
    event: string,
    data: unknown,
  ): void {
    this.connectedUsers.forEach(({ socket, user }) => {
      if (user.username !== excludedUsername) {
        socket.emit(event, data);
      }
    });
  }

  @SubscribeMessage(EVENTS.JOIN)
  userJoin(
    @MessageBody('user') user: User | undefined,
    @ConnectedSocket() client: Socket,
  ): WsResponse<User[]> {
    const { username } = user ?? {};
    if (
      username !== undefined &&
      this.connectedUsers.find((u) => u.user.username === username) ===
        undefined
    ) {
      this.connectedUsers.push({ socket: client, user });
      this.sendMessageToAllUsersExceptOne(
        username,
        EVENTS.UPDATE_LOBBY,
        this.connectedUsers.map((u) => u.user),
      );
    }
    return {
      event: EVENTS.UPDATE_LOBBY,
      data: this.connectedUsers.map((u) => u.user),
    };
  }

  @SubscribeMessage('disconnect')
  handleDisconnect(@ConnectedSocket() client: Socket): void {
    this.connectedUsers = this.connectedUsers.filter(
      ({ socket }) => socket.id !== client.id,
    );
    this.sendMessageToAllUsers(
      EVENTS.UPDATE_LOBBY,
      this.connectedUsers.map((u) => u.user),
    );
  }
}
