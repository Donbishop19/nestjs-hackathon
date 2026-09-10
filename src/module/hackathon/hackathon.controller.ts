import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  AuthGuard,
  Roles,
  Session,
  type UserSession,
} from '@thallesp/nestjs-better-auth';
import { auth } from '../../auth.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { CreateHackathonDto } from './dto/create-hackathon.dto.js';
import { UpdateHackathonDto } from './dto/update-hackathon.dto.js';
import { HackathonService } from './hackathon.service.js';

@Controller('hackathon')
@UseGuards(AuthGuard)
export class HackathonController {
  constructor(private readonly hackathonService: HackathonService) {}

  @Post()
  @Roles(['admin'])
  @ResponseMessage('Hackathon created successfully')
  create(
    @Body() createHackathonDto: CreateHackathonDto,
    @Session() session: UserSession<typeof auth>,
  ) {
    return this.hackathonService.create(createHackathonDto, session.user.id);
  }

  @Post(':id/join')
  @Roles(['PARTICIPANT'])
  @ResponseMessage('Hackathon joined successfully')
  join(@Param('id') id: string, @Session() session: UserSession<typeof auth>) {
    return this.hackathonService.join(id, session.user.id);
  }

  @Get()
  findAll() {
    return this.hackathonService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.hackathonService.findOne(id);
  }

  @Patch(':id')
  @Roles(['admin'])
  @ResponseMessage('Hackathon updated successfully')
  update(
    @Param('id') id: string,
    @Body() updateHackathonDto: UpdateHackathonDto,
  ) {
    return this.hackathonService.update(id, updateHackathonDto);
  }

  @Delete(':id')
  @Roles(['admin'])
  @ResponseMessage('Hackathon deleted successfully')
  remove(@Param('id') id: string) {
    return this.hackathonService.remove(id);
  }
}
