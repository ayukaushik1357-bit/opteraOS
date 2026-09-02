import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Legal registered name' })
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @ApiPropertyOptional({ description: 'Display name (defaults to legalName if empty)' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Parent company ID for enterprise group hierarchies' })
  @IsString()
  @IsOptional()
  parentCompanyId?: string;

  @ApiPropertyOptional({ description: 'Tax Identifiers (GSTIN, PAN, VAT, EIN)' })
  @IsObject()
  @IsOptional()
  taxIdentifiers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Registration Identifiers (CIN, RegNo)' })
  @IsObject()
  @IsOptional()
  registrationIdentifiers?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Industry vertical' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size (e.g. 1-10, 11-50, 51-200, 200+)' })
  @IsString()
  @IsOptional()
  companySize?: string;

  @ApiPropertyOptional({ description: 'Company website URL' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Company contact email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Company contact phone' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Relationship type (CUSTOMER, VENDOR, PARTNER, SUBSIDIARY, PROSPECT)', default: 'CUSTOMER' })
  @IsString()
  @IsOptional()
  relationshipType?: string;

  @ApiPropertyOptional({ description: 'Status', default: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Custom fields' })
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  legalName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  parentCompanyId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  taxIdentifiers?: Record<string, string>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  registrationIdentifiers?: Record<string, string>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  companySize?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  relationshipType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  customFields?: Record<string, any>;
}

export class QueryCompaniesDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  relationshipType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  pageSize?: number;
}
