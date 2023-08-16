import { BadRequestException, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Game, GameDocument } from './schemas';
import { IGameHistory } from '../classes';

@Injectable()
export class GamesService {
  constructor(
    @InjectModel(Game.name)
    private readonly gameModel: Model<GameDocument>,
  ) {}

  async getAll(user: any): Promise<Game[]> {
    const [gamesAsBlack, gamesAsWhite] = await Promise.allSettled([
      this.gameModel.find({ black: user.username }, { __v: 0, _id: 0 }),
      this.gameModel.find({ white: user.username }, { __v: 0, _id: 0 }),
    ]);
    return [
      ...(gamesAsBlack.status === 'fulfilled' ? gamesAsBlack.value : []),
      ...(gamesAsWhite.status === 'fulfilled' ? gamesAsWhite.value : []),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async findOne(id: string): Promise<Game | null> {
    return this.gameModel.findOne({ id }, { __v: 0, _id: 0 });
  }

  async save(gameDto: IGameHistory): Promise<void> {
    if ((await this.findOne(gameDto.id)) !== null) {
      throw new BadRequestException('Failed to save game: game with this id already exists');
    }

    const newGame = new this.gameModel(gameDto);
    await newGame.save();
  }
}
