import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from '@thallesp/nestjs-better-auth';
import { UserService } from './user.service.js';

@Controller('user')
@UseGuards(AuthGuard)
@Roles(['admin'])
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('all')
  @Roles(['ADMIN'])
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}
