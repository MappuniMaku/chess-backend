import { User } from '../../users/schemas';

export interface IPlayer {
  user: User;
  isGameAccepted: boolean;
}

export interface IPiece {
  id: number;
  type: string;
  color: string;
  hasMadeAnyMoves: boolean;
}

export interface IPiecePosition {
  row: number;
  col: number;
}

export interface IMove {
  piece: IPiece;
  finalPosition: IPiecePosition;
  selectedPieceTypeToTransform?: string;
  isMate?: boolean;
  isStalemate?: boolean;
}

export interface IGame {
  id: string;
  black: IPlayer;
  white: IPlayer;
  movesLog: IMove[];
  isStarted: boolean;
  acceptanceStatus?: {
    secondsLeft: number;
    interval?: ReturnType<typeof setInterval>;
  };
}

export type IGameResult = 'whiteWin' | 'blackWin' | 'draw';
