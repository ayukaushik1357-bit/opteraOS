import { IsString, IsOptional, IsEnum, IsInt, IsNumber, IsEmail, Min, Max, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { LeadStage } from '@prisma/client';

export enum LeadPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class CreateLeadDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() source?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(LeadStage) stage?: LeadStage;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) score?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
  /** Front-end sends this for scoring weight — stored in notes metadata, not a DB column */
  @ApiPropertyOptional() @IsOptional() @IsNumber() expectedRevenue?: number;
  /** Front-end priority hint used in scoring — not a DB column */
  @ApiPropertyOptional() @IsOptional() @IsEnum(LeadPriority) priority?: LeadPriority;
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {}

export class DisqualifyLeadDto {
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class ConvertLeadDto {
  @ApiPropertyOptional() @IsOptional() @IsString() dealTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() value?: number;
}

export class AssignLeadDto {
  @ApiProperty() @IsString() strategy: string; // ROUND_ROBIN | LOAD_BASED | MANUAL
  @ApiPropertyOptional() @IsOptional() @IsString() targetUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() salesTeamId?: string;
}

export class CheckDuplicatesDto {
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() company?: string;
}

export class BulkLeadActionDto {
  @ApiProperty() @IsArray() leadIds: string[];
  @ApiProperty() @IsString() action: string; // 'delete' | 'qualify' | 'disqualify' | 'assign' | 'stage'
  @ApiPropertyOptional() @IsOptional() payload?: any;
}

export class ImportLeadsDto {
  @ApiProperty() @IsArray() rows: any[];
}
