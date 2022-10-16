import { User } from '../../users/schemas';

export interface IBannedPlayer {
  user: User;
  consequentlyDeclinedGamesCount: number;
  isBanActive: boolean;
  timeLeft: number;
  interval?: ReturnType<typeof setInterval>;
}
