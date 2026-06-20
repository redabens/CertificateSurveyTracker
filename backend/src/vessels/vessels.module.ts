import { Module } from '@nestjs/common';
import { VesselsService } from './vessels.service';
import { VesselsController } from './vessels.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [VesselsService],
  controllers: [VesselsController],
  exports: [VesselsService],
})
export class VesselsModule {}
