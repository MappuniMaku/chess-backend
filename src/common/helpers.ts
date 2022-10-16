import { User } from '../users/schemas';
import { Game } from '../classes';

export const get50PercentRandomResult = (): boolean => Math.random() < 0.5;

export const isUserParticipatingInGame = (game: Game, user: User): boolean =>
  game.white.user.username === user.username || game.black.user.username === user.username;

export const isUserPlayingAsWhite = (game: Game, user: User): boolean =>
  game.white.user.username === user.username;
