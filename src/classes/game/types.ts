import { User } from '../../users/schemas';

export interface IPlayer {
  user: User;
  isGameAccepted: boolean;
}

export enum PieceColor {
  White = 'white',
  Black = 'black',
}

export enum GameResult {
  WhiteWin = 'whiteWin',
  BlackWin = 'blackWin',
  Draw = 'draw',
}

export interface IPiece {
  id: number;
  type: string;
  color: PieceColor;
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

export interface IGameHistory {
  id: string;
  black: IPlayer;
  white: IPlayer;
  movesLog: IMove[];
  result: GameResult;
}
