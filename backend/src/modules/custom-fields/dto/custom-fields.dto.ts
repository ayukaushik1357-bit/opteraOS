import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';

export class CreateCustomFieldDefinitionDto {
  @ApiProperty({ description: 'Target entity type (e.g. Customer, Contact, Company, Employee, Deal, Task)' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ description: 'Unique field key (e.g. gstin, lead_source_details, emergency_contact)' })
  @IsString()
  @IsNotEmpty()
  fieldKey: string;

  @ApiProperty({ description: 'Human readable label' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({ enum: CustomFieldType, default: CustomFieldType.TEXT })
  @IsEnum(CustomFieldType)
  @IsOptional()
  fieldType?: CustomFieldType;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defaultValue?: string;

  @ApiPropertyOptional({ description: 'Options for SELECT / MULTI_SELECT fields' })
  @IsObject()
  @IsOptional()
  options?: any;

  @ApiPropertyOptional({ description: 'Validation rules configuration' })
  @IsObject()
  @IsOptional()
  validationRules?: any;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  orderIndex?: number;
}

export class UpdateCustomFieldDefinitionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  defaultValue?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  options?: any;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  validationRules?: any;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  orderIndex?: number;
}

export class SetCustomFieldValueDto {
  @ApiProperty({ description: 'Field Definition ID' })
  @IsString()
  @IsNotEmpty()
  fieldDefinitionId: string;

  @ApiProperty({ description: 'Entity Type' })
  @IsString()
  @IsNotEmpty()
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional()
  @IsOptional()
  valueText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  valueNumber?: number;

  @ApiPropertyOptional()
  @IsOptional()
  valueBoolean?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  valueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  valueJson?: any;
}
