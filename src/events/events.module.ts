import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { GamesModule } from '../games/games.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [GamesModule, UsersModule],
  providers: [EventsGateway],
})
export class EventsModule {}
