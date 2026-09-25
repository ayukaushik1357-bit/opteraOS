import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from './dto/customers.dto';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers (paginated)' })
  findAll(@Param('orgId') orgId: string, @Query() query: CustomerQueryDto) {
    return this.service.findAll(orgId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get customer statistics' })
  getStats(@Param('orgId') orgId: string) {
    return this.service.getStats(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single customer with related data' })
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a customer' })
  create(@Param('orgId') orgId: string, @Body() dto: CreateCustomerDto) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(orgId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a customer' })
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }
}
