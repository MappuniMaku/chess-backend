import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';
import { comparePasswords } from './helpers';
import { User } from '../users/schemas';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async validateUser(username: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findOne(username, true);
    if (user !== null && (await comparePasswords(pass, user.password as string))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const { username, _id } = user?._doc ?? {};
    const payload = { username, sub: _id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
