import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop()
  username: string;

  @Prop()
  rating: number;

  @Prop()
  initialRating: number;

  @Prop()
  createdAt: string;

  @Prop()
  password?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
