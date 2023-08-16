import { v4 as uuidv4 } from 'uuid';

import { GameResult, IGame, IGameHistory, IMove, IPlayer, IRatingChange } from './types';
import { User } from '../../users/schemas';
import { get50PercentRandomResult } from '../../common/helpers';
import { CONFIRM_GAME_TIME_LIMIT } from './constants';

export class Game implements IGame {
  id: string;
  white: IPlayer;
  black: IPlayer;
  movesLog: IMove[];
  isStarted: boolean;
  acceptanceStatus?: {
    secondsLeft: number;
    interval?: ReturnType<typeof setInterval>;
  };
  result?: GameResult;
  ratingChange?: IRatingChange;

  constructor({
    user1,
    user2,
    acceptTimeoutCallback,
  }: {
    user1: User;
    user2: User;
    acceptTimeoutCallback: (game: Game) => void;
  }) {
    this.id = uuidv4();
    const isUser1White = get50PercentRandomResult();
    this.black = {
      user: isUser1White ? user2 : user1,
      isGameAccepted: false,
    };
    this.white = {
      user: isUser1White ? user1 : user2,
      isGameAccepted: false,
    };
    this.movesLog = [];
    this.isStarted = false;
    this.acceptanceStatus = {
      secondsLeft: CONFIRM_GAME_TIME_LIMIT,
      interval: setInterval(() => {
        if (this.acceptanceStatus === undefined) {
          return;
        }
        this.acceptanceStatus.secondsLeft -= 1;
        if (this.acceptanceStatus.secondsLeft === 0) {
          this.clearAcceptInterval();
          acceptTimeoutCallback(this);
        }
      }, 1000),
    };
  }

  getPayloadData(): IGame {
    return {
      id: this.id,
      black: this.black,
      white: this.white,
      movesLog: this.movesLog,
      isStarted: this.isStarted,
      acceptanceStatus:
        this.acceptanceStatus !== undefined
          ? { secondsLeft: this.acceptanceStatus.secondsLeft }
          : undefined,
    };
  }

  getHistoryData(): IGameHistory {
    return {
      id: this.id,
      date: new Date().toISOString(),
      black: this.black.user.username,
      white: this.white.user.username,
      movesLog: this.movesLog,
      result: this.result as GameResult,
      ratingChange: this.ratingChange as IRatingChange,
    };
  }

  clearAcceptInterval(): void {
    if (this.acceptanceStatus?.interval !== undefined) {
      clearInterval(this.acceptanceStatus.interval);
      this.acceptanceStatus.interval = undefined;
    }
  }

  start(): void {
    this.clearAcceptInterval();
    this.isStarted = true;
  }

  addMove(move: IMove): void {
    this.movesLog.push(move);
  }

  setResult(result: GameResult): void {
    this.result = result;
    this.ratingChange =
      result === GameResult.Draw
        ? {
            white: 0,
            black: 0,
          }
        : {
            white: result === GameResult.WhiteWin ? 25 : -25,
            black: result === GameResult.BlackWin ? 25 : -25,
          };
  }
}
