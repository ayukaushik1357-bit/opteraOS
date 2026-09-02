import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'Target entity type (e.g. Customer, Contact, Company, Lead, Deal, Task, Employee)' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ description: 'Target entity ID' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiProperty({ description: 'Note / Comment content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'User IDs mentioned in comment' })
  @IsArray()
  @IsOptional()
  mentions?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: any;
}

export class UpdateCommentDto {
  @ApiProperty({ description: 'Updated comment text' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  mentions?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: any;
}
