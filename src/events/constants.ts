export enum WsEvents {
  Connect = 'connect',
  Join = 'join',
  UpdateLobby = 'update-lobby',
  Disconnect = 'disconnect',
  StartSearching = 'start-searching',
  CancelSearching = 'cancel-searching',
  UpdateGame = 'update-game',
}

export const MAX_OPPONENTS_RATING_DIFFERENCE = 500;
