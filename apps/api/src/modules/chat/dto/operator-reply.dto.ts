import { IsNotEmpty, IsString } from 'class-validator';

export class OperatorReplyDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
