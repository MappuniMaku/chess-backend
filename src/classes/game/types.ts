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
  initialPosition: IPiecePosition;
  finalPosition: IPiecePosition;
  wasCaptureMade?: boolean;
  castlingType?: string;
  selectedPieceTypeToTransform?: string;
  wasCheckMade?: boolean;
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
