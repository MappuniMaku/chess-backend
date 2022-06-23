import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from './schemas';
import { CreateUserDto } from './dto';
import { hashPassword } from '../auth/helpers';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getAll(): Promise<User[]> {
    return this.userModel.find({}, { _id: 0, __v: 0, password: 0 });
  }

  async findOne(username: string, shouldReturnPassword = false): Promise<User> {
    return this.userModel
      .findOne(
        { username },
        { _id: 0, __v: 0, password: shouldReturnPassword ? 1 : 0 },
      )
      .exec();
  }

  async create(userDto: CreateUserDto): Promise<User> {
    const { username, password, rating } = userDto;
    if ((await this.findOne(username)) !== null) {
      throw new HttpException(
        'User with this username already exists',
        HttpStatus.BAD_REQUEST,
      );
    }
    const hashedPassword = await hashPassword(password);
    const newUser = new this.userModel({
      ...userDto,
      password: hashedPassword,
    });
    await newUser.save();
    return {
      username,
      rating,
    };
  }
}
