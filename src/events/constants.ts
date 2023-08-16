export enum WsEvents {
  Connect = 'connect',
  Join = 'join',
  UpdateLobby = 'update-lobby',
  Disconnect = 'disconnect',
  StartSearching = 'start-searching',
  CancelSearching = 'cancel-searching',
  UpdateGame = 'update-game',
  AcceptGame = 'accept-game',
  DeclineGame = 'decline-game',
  MakeMove = 'make-move',
}

// TODO: set this back
export const MAX_OPPONENTS_RATING_DIFFERENCE = Infinity;
