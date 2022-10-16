import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WsResponse,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';

import { LOCALHOST_FRONTEND_ADDRESS, PRODUCTION_FRONTEND_ADDRESS } from '../constants';
import { MAX_OPPONENTS_RATING_DIFFERENCE, WsEvents } from './constants';
import { User } from '../users/schemas';
import { IConnectedClient, IWsEventData } from './types';
import { BannedPlayer, Game, IBannedPlayer, IGame } from '../classes';
import { isUserParticipatingInGame, isUserPlayingAsWhite } from '../common/helpers';

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
  playersBannedFromSearch: BannedPlayer[] = [];

  getAuthenticatedUsers(): User[] {
    return this.connectedClients.map(({ user }) => user).filter((u) => u !== undefined) as User[];
  }

  getConnectedClientBySocketId(socketId: string): IConnectedClient | undefined {
    return this.connectedClients.find(({ socket }) => socket.id === socketId);
  }

  getConnectedClientByUsername(username: string): IConnectedClient | undefined {
    return this.connectedClients.find(({ user }) => user?.username === username);
  }

  sendMessageToClient = (
    socketId: string | undefined,
    event: WsEvents,
    data: IWsEventData,
  ): void => {
    if (socketId === undefined) {
      return;
    }
    const targetUser = this.connectedClients.find(({ socket }) => socket.id === socketId);
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

  getUserAndTargetGame = (
    socketId: string,
    gameId: string,
  ): { user: User; targetGame: Game; hasError: boolean } => {
    let hasError = false;
    const targetClient = this.getConnectedClientBySocketId(socketId);
    const user = targetClient?.user as User;
    if (user === undefined) {
      hasError = true;
    }
    const targetGame = this.activeGames.find((g) => g.id === gameId) as Game;
    if (targetGame === undefined || !isUserParticipatingInGame(targetGame, user)) {
      hasError = true;
    }
    return {
      user,
      targetGame,
      hasError,
    };
  };

  removeDeclinedGame(game: Game): void {
    const { id, white, black } = game;
    this.activeGames = this.activeGames.filter((g) => g.id !== id);
    const isGameDeclinedByWhite = !white.isGameAccepted;
    const isGameDeclinedByBlack = !black.isGameAccepted;
    [white, black].forEach((p, i) => {
      const { user, isGameAccepted } = p;
      const client = this.getConnectedClientByUsername(user.username);
      this.sendMessageToClient(client?.socket.id, WsEvents.UpdateGame, {
        game: undefined,
        isDeclinedByOpponent:
          isGameAccepted && (i === 0 ? isGameDeclinedByBlack : isGameDeclinedByWhite),
      });
      if (!isGameAccepted) {
        this.banUserFromSearch(user);
      }
    });
  }

  getActivelyBannedPlayers(): IBannedPlayer[] {
    return this.playersBannedFromSearch.filter((p) => p.isBanActive).map((p) => p.getPayloadData());
  }

  sendInfoAboutBannedUsers(): void {
    this.sendMessageToAllClients(WsEvents.UpdateLobby, {
      bannedPlayers: this.getActivelyBannedPlayers(),
    });
  }

  banUserFromSearch(user: User): void {
    const targetPlayer = this.playersBannedFromSearch.find(
      (u) => u.user.username === user.username,
    );
    if (targetPlayer === undefined) {
      this.playersBannedFromSearch.push(
        new BannedPlayer(user, this.sendInfoAboutBannedUsers.bind(this)),
      );
      return;
    }
    targetPlayer.prolongBan();
    this.sendInfoAboutBannedUsers();
  }

  unbanUserFromSearchIfNecessary(user: User): void {
    const targetPlayer = this.playersBannedFromSearch.find(
      (u) => u.user.username === user.username,
    );
    if (targetPlayer === undefined) {
      return;
    }
    if (targetPlayer.consequentlyDeclinedGamesCount > 0) {
      targetPlayer.reduceDeclinedGamesCount();
      return;
    }
    this.playersBannedFromSearch = this.playersBannedFromSearch.filter(
      (u) => u.user.username !== user.username,
    );
    this.sendInfoAboutBannedUsers();
  }

  @SubscribeMessage(WsEvents.Connect)
  handleConnection(@ConnectedSocket() client: Socket): void {
    this.connectedClients.push({ socket: client });
  }

  @SubscribeMessage(WsEvents.Join)
  userJoined(
    @MessageBody('user') user: User | undefined,
    @ConnectedSocket() client: Socket,
  ): WsResponse<{ users: User[]; searchingForGameUsers: User[]; bannedPlayers: IBannedPlayer[] }> {
    const targetClient = this.getConnectedClientBySocketId(client.id);
    if (targetClient !== undefined) {
      targetClient.user = user;
    } else {
      this.connectedClients.push({ socket: client, user });
    }
    const authenticatedUsers = this.getAuthenticatedUsers();
    if (user !== undefined) {
      this.sendMessageToAllClientsExceptOne(client.id, WsEvents.UpdateLobby, {
        users: authenticatedUsers,
      });
      const activeGame = this.activeGames.find(
        (g) => g.white.user.username === user.username || g.black.user.username === user.username,
      );
      if (activeGame !== undefined) {
        this.sendMessageToClient(client.id, WsEvents.UpdateGame, {
          game: activeGame.getPayloadData(),
        });
      }
    }
    return {
      event: WsEvents.UpdateLobby,
      data: {
        users: authenticatedUsers,
        searchingForGameUsers: this.playersSearchingForGame,
        bannedPlayers: this.getActivelyBannedPlayers(),
      },
    };
  }

  @SubscribeMessage(WsEvents.Disconnect)
  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const targetClient = this.getConnectedClientBySocketId(client.id);
    this.connectedClients = this.connectedClients.filter(({ socket }) => socket.id !== client.id);
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
  ): WsResponse<{ searchingForGameUsers?: User[]; game?: IGame }> | undefined {
    const targetClient = this.getConnectedClientBySocketId(client.id);
    const { user } = targetClient ?? {};
    if (
      user === undefined ||
      this.playersSearchingForGame.some((u) => u.username === user.username) ||
      this.playersBannedFromSearch.some((p) => p.user.username === user.username && p.isBanActive)
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
    const newGame = new Game({
      user1: user,
      user2: opponent,
      acceptTimeoutCallback: this.removeDeclinedGame.bind(this),
    });
    this.activeGames.push(newGame);

    const opponentClient = this.getConnectedClientByUsername(opponent.username);
    this.sendMessageToClient(opponentClient?.socket.id, WsEvents.UpdateLobby, {
      searchingForGameUsers: this.playersSearchingForGame,
    });
    this.sendMessageToClient(opponentClient?.socket.id, WsEvents.UpdateGame, {
      game: newGame.getPayloadData(),
    });
    return {
      event: WsEvents.UpdateGame,
      data: {
        game: newGame.getPayloadData(),
      },
    };
  }

  @SubscribeMessage(WsEvents.CancelSearching)
  userCancelledSearching(
    @ConnectedSocket() client: Socket,
  ): WsResponse<{ searchingForGameUsers: User[] }> | undefined {
    const targetClient = this.getConnectedClientBySocketId(client.id);
    const { user } = targetClient ?? {};
    if (
      user === undefined ||
      !this.playersSearchingForGame.some((u) => u.username === user.username)
    ) {
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

  @SubscribeMessage(WsEvents.AcceptGame)
  userAcceptedGame(
    @ConnectedSocket() client: Socket,
    @MessageBody('gameId') gameId: string,
  ): WsResponse<{ game?: IGame }> | undefined {
    const { user, targetGame, hasError } = this.getUserAndTargetGame(client.id, gameId);
    if (hasError || targetGame.isStarted) {
      return;
    }

    this.unbanUserFromSearchIfNecessary(user);
    const isUserWhite = isUserPlayingAsWhite(targetGame, user);
    const currentPlayer = targetGame[isUserWhite ? 'white' : 'black'];
    if (currentPlayer.isGameAccepted) {
      return;
    }
    currentPlayer.isGameAccepted = true;

    const opponent = targetGame[isUserWhite ? 'black' : 'white'];
    if (opponent.isGameAccepted) {
      targetGame.isStarted = true;
      const opponentClient = this.getConnectedClientByUsername(opponent.user.username);
      this.sendMessageToClient(opponentClient?.socket.id, WsEvents.UpdateGame, {
        game: targetGame.getPayloadData(),
      });
    }

    return {
      event: WsEvents.UpdateGame,
      data: {
        game: targetGame.getPayloadData(),
      },
    };
  }

  @SubscribeMessage(WsEvents.DeclineGame)
  userDeclinedGame(
    @ConnectedSocket() client: Socket,
    @MessageBody('gameId') gameId: string,
  ): WsResponse<{ game: undefined }> | undefined {
    const { user, targetGame, hasError } = this.getUserAndTargetGame(client.id, gameId);
    if (hasError || targetGame.isStarted || !this.activeGames.some((g) => g.id === gameId)) {
      return;
    }

    targetGame.clearIntervals();
    this.activeGames = this.activeGames.filter((g) => g.id !== targetGame.id);
    this.banUserFromSearch(user);

    const isUserWhite = isUserPlayingAsWhite(targetGame, user);
    const opponent = targetGame[isUserWhite ? 'black' : 'white'];
    const opponentClient = this.getConnectedClientByUsername(opponent.user.username);
    this.sendMessageToClient(opponentClient?.socket.id, WsEvents.UpdateGame, {
      game: undefined,
      isDeclinedByOpponent: true,
    });

    return {
      event: WsEvents.UpdateGame,
      data: { game: undefined },
    };
  }
}
