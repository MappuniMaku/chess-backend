import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import {
  GameResult,
  IGameHistory,
  IMove,
  IPiece,
  IPiecePosition,
  IRatingChange,
  PieceColor,
} from '../../classes';

export type GameDocument = Game & Document;

@Schema()
class Piece implements IPiece {
  @Prop()
  id: number;

  @Prop()
  type: string;

  @Prop()
  color: PieceColor;

  @Prop()
  hasMadeAnyMoves: boolean;
}

@Schema()
class PiecePosition implements IPiecePosition {
  @Prop()
  row: number;

  @Prop()
  col: number;
}

@Schema()
class Move implements IMove {
  @Prop()
  piece: Piece;

  @Prop()
  finalPosition: PiecePosition;

  @Prop()
  selectedPieceTypeToTransform?: string;

  @Prop()
  isMate?: boolean;

  @Prop()
  isStalemate?: boolean;
}

@Schema()
class RatingChange implements IRatingChange {
  @Prop()
  white: number;

  @Prop()
  black: number;
}

@Schema()
export class Game implements IGameHistory {
  @Prop()
  id: string;

  @Prop()
  date: string;

  @Prop()
  black: string;

  @Prop()
  white: string;

  @Prop()
  movesLog: Move[];

  @Prop()
  result: GameResult;

  @Prop()
  ratingChange: RatingChange;
}

export const GameSchema = SchemaFactory.createForClass(Game);
