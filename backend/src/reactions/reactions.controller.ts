import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReactionsService } from './reactions.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionSummaryQueryDto } from './dto/reaction-summary-query.dto';

@Controller('reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  toggle(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateReactionDto,
  ) {
    return this.reactionsService.toggle(req.user.userId, dto);
  }

  @Get('summary')
  summary(@Query() query: ReactionSummaryQueryDto) {
    return this.reactionsService.summary(query);
  }
}
