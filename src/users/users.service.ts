import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from './schemas';
import { CreateUserDto, UsersFiltersDto } from './dto';
import { hashPassword } from '../auth/helpers';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getAll(query?: UsersFiltersDto): Promise<User[]> {
    const { username, sort } = query;

    const sortObject = {};
    switch (sort) {
      case 'username_asc':
        sortObject['username'] = 1;
        break;
      case 'username_desc':
        sortObject['username'] = -1;
        break;
      case 'rating_asc':
        sortObject['rating'] = 1;
        break;
      case 'rating_desc':
        sortObject['rating'] = -1;
        break;
    }

    return this.userModel.find(
      { username: { $regex: username ?? '' } },
      { _id: 0, __v: 0, password: 0 },
      {
        sort: sortObject,
      },
    );
  }

  async findOne(username: string, shouldReturnPassword = false): Promise<User> {
    const projection = {
      __v: 0,
    };
    return this.userModel.findOne(
      { username },
      shouldReturnPassword
        ? projection
        : { ...projection, password: 0, _id: 0 },
    );
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
