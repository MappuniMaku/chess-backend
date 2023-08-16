import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { GamesModule } from '../games/games.module';

@Module({
  imports: [GamesModule],
  providers: [EventsGateway],
})
export class EventsModule {}
