import { User } from '../../users/schemas';
import { BAN_SECONDS_PER_DECLINED_GAME } from './constants';
import { IBannedPlayer } from './types';

export class BannedPlayer implements IBannedPlayer {
  user: User;
  consequentlyDeclinedGamesCount: number;
  isBanActive: boolean;
  timeLeft: number;
  interval?: ReturnType<typeof setInterval>;

  constructor(user: User, banTimeoutEndCallback: () => void) {
    this.user = user;
    this.consequentlyDeclinedGamesCount = 1;
    this.timeLeft = 0;
    this.addBanTimeout = this.addBanTimeout.bind(this, banTimeoutEndCallback);
  }

  addBanTimeout(timeoutEndCallback?: () => void): void {
    this.timeLeft = (this.consequentlyDeclinedGamesCount - 1) * BAN_SECONDS_PER_DECLINED_GAME;
    this.isBanActive = true;
    this.interval = setInterval(() => {
      this.timeLeft -= 1;
      if (this.timeLeft === 0) {
        this.isBanActive = false;
        clearInterval(this.interval);
        if (timeoutEndCallback !== undefined) {
          timeoutEndCallback();
        }
      }
    }, 1000);
  }

  prolongBan(): void {
    this.consequentlyDeclinedGamesCount += 1;
    this.addBanTimeout();
  }

  getPayloadData(): IBannedPlayer {
    return {
      user: this.user,
      consequentlyDeclinedGamesCount: this.consequentlyDeclinedGamesCount,
      isBanActive: this.isBanActive,
      timeLeft: this.timeLeft,
    };
  }

  reduceDeclinedGamesCount(): void {
    this.consequentlyDeclinedGamesCount -= 1;
  }
}
