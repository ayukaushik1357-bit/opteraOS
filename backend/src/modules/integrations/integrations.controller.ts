import { Controller, Get, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all available integrations with connection status' })
  findAll(@Param('orgId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Post(':type/connect')
  @ApiOperation({ summary: 'Connect and configure an integration' })
  connect(@Param('orgId') orgId: string, @Param('type') type: string, @Body() body: any) {
    return this.service.connect(orgId, type, body.config || body);
  }

  @Post(':type/disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect an integration' })
  disconnect(@Param('orgId') orgId: string, @Param('type') type: string) {
    return this.service.disconnect(orgId, type);
  }
}
