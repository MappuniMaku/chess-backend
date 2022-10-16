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
import { MAX_OPPONENTS_RATING_DIFFERENCE, WsEvents } from './constants';
import { User } from '../users/schemas';
import { IConnectedClient, IWsEventData } from './types';
import { Game } from '../game';

@WebSocketGateway({
  transports: ['websocket'],
  cors:
    process.env.NODE_ENV === 'development'
      ? LOCALHOST_FRONTEND_ADDRESS
      : PRODUCTION_FRONTEND_ADDRESS,
})
export class EventsGateway {
  connectedClients: IConnectedClient[] = [];
  playersSearchingForGame: User[] = [];
  activeGames: Game[] = [];

  getAuthenticatedUsers(): User[] {
    return this.connectedClients
      .map(({ user }) => user)
      .filter((u) => u !== undefined) as User[];
  }

  getConnectedClientBySocketId(socketId: string): IConnectedClient | undefined {
    return this.connectedClients.find(({ socket }) => socket.id === socketId);
  }

  getConnectedClientByUsername(username: string): IConnectedClient | undefined {
    return this.connectedClients.find(
      ({ user }) => user?.username === username,
    );
  }

  sendMessageToClient = (
    socketId: string | undefined,
    event: WsEvents,
    data: IWsEventData,
  ): void => {
    if (socketId === undefined) {
      return;
    }
    const targetUser = this.connectedClients.find(
      ({ socket }) => socket.id === socketId,
    );
    targetUser?.socket.emit(event, data);
  };

  sendMessageToAllClients(event: WsEvents, data: IWsEventData): void {
    this.connectedClients.forEach(({ socket }) => {
      socket.emit(event, data);
    });
  }

  sendMessageToAllClientsExceptOne(
    excludedSocketId: string,
    event: WsEvents,
    data: IWsEventData,
  ): void {
    this.connectedClients.forEach(({ socket }) => {
      if (socket.id !== excludedSocketId) {
        socket.emit(event, data);
      }
    });
  }

  findAppropriateOpponent(user: User): User | undefined {
    return this.playersSearchingForGame.find(
      (u) =>
        u.username !== user.username &&
        Math.abs(u.rating - user.rating) <= MAX_OPPONENTS_RATING_DIFFERENCE,
    );
  }

  @SubscribeMessage(WsEvents.Connect)
  handleConnection(@ConnectedSocket() client: Socket): void {
    this.connectedClients.push({ socket: client });
  }

  @SubscribeMessage(WsEvents.Join)
  userJoined(
    @MessageBody('user') user: User | undefined,
    @ConnectedSocket() client: Socket,
  ): WsResponse<{ users: User[]; searchingForGameUsers: User[] }> {
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
      this.sendMessageToAllClientsExceptOne(client.id, WsEvents.UpdateLobby, {
        users: authenticatedUsers,
      });
    }
    return {
      event: WsEvents.UpdateLobby,
      data: {
        users: authenticatedUsers,
        searchingForGameUsers: this.playersSearchingForGame,
      },
    };
  }

  @SubscribeMessage(WsEvents.Disconnect)
  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const targetClient = this.getConnectedClientBySocketId(client.id);
    this.connectedClients = this.connectedClients.filter(
      ({ socket }) => socket.id !== client.id,
    );
    if (targetClient?.user === undefined) {
      return;
    }
    this.sendMessageToAllClients(WsEvents.UpdateLobby, {
      users: this.getAuthenticatedUsers(),
    });
  }

  @SubscribeMessage(WsEvents.StartSearching)
  userStartedSearching(
    @ConnectedSocket() client: Socket,
  ): WsResponse<{ searchingForGameUsers?: User[]; game?: Game }> | undefined {
    const targetClient = this.getConnectedClientBySocketId(client.id);
    const { user } = targetClient ?? {};
    if (
      user === undefined ||
      this.playersSearchingForGame.some((u) => u.username === user.username)
    ) {
      return;
    }

    const opponent = this.findAppropriateOpponent(user);
    if (opponent === undefined) {
      this.playersSearchingForGame.push(user);
      this.sendMessageToAllClientsExceptOne(client.id, WsEvents.UpdateLobby, {
        searchingForGameUsers: this.playersSearchingForGame,
      });
      return {
        event: WsEvents.UpdateLobby,
        data: {
          searchingForGameUsers: this.playersSearchingForGame,
        },
      };
    }
    this.playersSearchingForGame = this.playersSearchingForGame.filter(
      (p) => p.username !== opponent.username,
    );
    const newGame = new Game({ user1: user, user2: opponent });
    this.activeGames.push(newGame);

    const opponentClient = this.getConnectedClientByUsername(opponent.username);
    this.sendMessageToClient(opponentClient?.socket.id, WsEvents.UpdateLobby, {
      searchingForGameUsers: this.playersSearchingForGame,
    });
    this.sendMessageToClient(opponentClient?.socket.id, WsEvents.UpdateGame, {
      game: newGame,
    });
    return {
      event: WsEvents.UpdateGame,
      data: {
        game: newGame,
      },
    };
  }

  @SubscribeMessage(WsEvents.CancelSearching)
  userCancelledSearching(
    @ConnectedSocket() client: Socket,
  ): WsResponse<{ searchingForGameUsers: User[] }> | undefined {
    const targetClient = this.getConnectedClientBySocketId(client.id);
    const { user } = targetClient ?? {};
    if (user === undefined) {
      return;
    }
    this.playersSearchingForGame = this.playersSearchingForGame.filter(
      (p) => p.username !== user.username,
    );
    this.sendMessageToAllClientsExceptOne(client.id, WsEvents.UpdateLobby, {
      searchingForGameUsers: this.playersSearchingForGame,
    });
    return {
      event: WsEvents.UpdateLobby,
      data: {
        searchingForGameUsers: this.playersSearchingForGame,
      },
    };
  }
}
