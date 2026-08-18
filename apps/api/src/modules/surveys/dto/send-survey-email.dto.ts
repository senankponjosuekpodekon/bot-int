import { IsNotEmpty, IsString } from 'class-validator';

export class SendSurveyEmailDto {
  @IsString() @IsNotEmpty() leadId: string;
  @IsString() @IsNotEmpty() email: string;
}
