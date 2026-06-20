import { Module } from '@nestjs/common';
import { ActionableService } from './actionable.service';
import { ActionableController } from './actionable.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [ActionableService],
  controllers: [ActionableController],
  exports: [ActionableService],
})
export class ActionableModule {}
