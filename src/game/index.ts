import { v4 as uuidv4 } from 'uuid';

import { IGame, IMove, IPlayer } from './types';
import { User } from '../users/schemas';
import { get50PercentRandomResult } from '../common/helpers';

export class Game implements IGame {
  id: string;
  black: IPlayer;
  white: IPlayer;
  movesLog: IMove[];
  isStarted: boolean;

  constructor({ user1, user2 }: { user1: User; user2: User }) {
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
  }
}
