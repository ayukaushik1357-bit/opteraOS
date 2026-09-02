import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto, UpdatePipelineDto, CreatePipelineStageDto, UpdatePipelineStageDto } from './dto/pipelines.dto';

@ApiTags('pipelines')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orgs/:orgId/pipelines')
export class PipelinesController {
  constructor(private readonly service: PipelinesService) {}

  @Get()
  @ApiOperation({ summary: 'List all pipelines and stages' })
  findAll(@Param('orgId') orgId: string) {
    return this.service.findAll(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single pipeline by ID' })
  findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new pipeline' })
  create(@Param('orgId') orgId: string, @Body() dto: CreatePipelineDto) {
    return this.service.create(orgId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update pipeline' })
  update(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: UpdatePipelineDto) {
    return this.service.update(orgId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate pipeline' })
  remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }

  @Post(':id/stages')
  @ApiOperation({ summary: 'Add a stage to a pipeline' })
  addStage(@Param('orgId') orgId: string, @Param('id') id: string, @Body() dto: CreatePipelineStageDto) {
    return this.service.addStage(orgId, id, dto);
  }

  @Patch(':id/stages/:stageId')
  @ApiOperation({ summary: 'Update a pipeline stage' })
  updateStage(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdatePipelineStageDto,
  ) {
    return this.service.updateStage(orgId, id, stageId, dto);
  }

  @Delete(':id/stages/:stageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a pipeline stage' })
  removeStage(@Param('orgId') orgId: string, @Param('id') id: string, @Param('stageId') stageId: string) {
    return this.service.removeStage(orgId, id, stageId);
  }
}
