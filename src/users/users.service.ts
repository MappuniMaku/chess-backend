import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from './schemas';
import { CreateUserDto, UsersFiltersDto } from './dto';
import { hashPassword } from '../auth/helpers';
import { PaginatedListDto } from '../common/dto';
import { ValidationError } from '../common/validation-error';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getAll(query: UsersFiltersDto): Promise<PaginatedListDto<User>> {
    const { username, sort, page, pageSize } = query;

    const numberPage = Number(page ?? 1);
    const numberPageSize = Number(pageSize ?? 30);

    const sortObject: Record<string, number> = {};
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

    const users = await this.userModel.find(
      { username: { $regex: username ?? '' } },
      { _id: 0, __v: 0, password: 0 },
      {
        limit: numberPageSize,
        skip: numberPageSize * (numberPage - 1),
        sort: sortObject,
      },
    );
    const totalItems = await this.userModel.countDocuments({
      username: { $regex: username ?? '' },
    });

    return {
      page: numberPage,
      pageSize: numberPageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / numberPageSize),
      items: users,
    };
  }

  async findOne(
    username: string,
    shouldReturnPassword = false,
  ): Promise<User | null> {
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
      throw new ValidationError({ username: 'isNotUnique' });
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
