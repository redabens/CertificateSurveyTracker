import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { VesselsModule } from './vessels/vessels.module';
import { CertificatesModule } from './certificates/certificates.module';
import { ActionableModule } from './actionable/actionable.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    VesselsModule,
    CertificatesModule,
    ActionableModule,
    EmailModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
