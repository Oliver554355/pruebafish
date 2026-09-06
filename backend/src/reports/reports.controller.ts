import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModeratorGuard } from '../auth/moderator.guard';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsDto } from './dto/list-reports.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @Get()
  findMany(@Query() query: ListReportsDto) {
    return this.reportsService.findMany(query);
  }

  @UseGuards(JwtAuthGuard, ModeratorGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateReportDto,
  ) {
    return this.reportsService.update(id, req.user.userId, dto);
  }
}
