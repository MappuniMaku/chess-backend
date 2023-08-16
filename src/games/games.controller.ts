import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { Game } from './schemas';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getAll(@Request() req: any): Promise<Game[]> {
    return this.gamesService.getAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Game | null> {
    return this.gamesService.findOne(id);
  }
}
