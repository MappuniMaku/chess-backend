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
  connectedUsers: { socket: Socket; user?: User }[] = [];

  getAuthenticatedUsers(): User[] {
    return this.connectedUsers
      .map((u) => u.user)
      .filter((u) => u !== undefined);
  }

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
      if (user?.username !== excludedUsername) {
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
    const newConnectedUser = { socket: client, user };
    const userIndex = this.connectedUsers.findIndex(
      (u) => u.socket?.id === client.id,
    );
    const isUserAlreadyConnected = userIndex !== -1;
    if (isUserAlreadyConnected) {
      this.connectedUsers[userIndex] = newConnectedUser;
    } else {
      this.connectedUsers.push(newConnectedUser);
    }
    const authenticatedUsers = this.getAuthenticatedUsers();
    if (username !== undefined) {
      this.sendMessageToAllUsersExceptOne(
        username,
        EVENTS.UPDATE_LOBBY,
        authenticatedUsers,
      );
    }
    return {
      event: EVENTS.UPDATE_LOBBY,
      data: authenticatedUsers,
    };
  }

  @SubscribeMessage('disconnect')
  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const targetEntry = this.connectedUsers.find(
      (u) => u.socket.id === client.id,
    );
    const { username } = targetEntry?.user ?? {};
    this.connectedUsers = this.connectedUsers.filter(
      ({ socket }) => socket.id !== client.id,
    );
    if (username === undefined) {
      return;
    }
    this.sendMessageToAllUsers(
      EVENTS.UPDATE_LOBBY,
      this.getAuthenticatedUsers(),
    );
  }
}
