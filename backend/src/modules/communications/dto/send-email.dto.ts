import { IsEmail, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({ description: 'Email subject line' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ description: 'Plain text content' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ description: 'HTML content' })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiPropertyOptional({ description: 'Sender from address' })
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ description: 'Reply-to email' })
  @IsString()
  @IsOptional()
  replyTo?: string;

  @ApiPropertyOptional({ description: 'CC email addresses' })
  @IsArray()
  @IsOptional()
  cc?: string[];

  @ApiPropertyOptional({ description: 'BCC email addresses' })
  @IsArray()
  @IsOptional()
  bcc?: string[];

  @ApiPropertyOptional({ description: 'Email file attachments' })
  @IsOptional()
  attachments?: Array<{
    filename: string;
    content: any;
    contentType?: string;
  }>;
}
