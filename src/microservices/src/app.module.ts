import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { CompetitorModule } from './competitor/competitor.module';
import { validateEnv } from './env';
import { ModelManagerService } from './shared/services/model-manager.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate: validateEnv,
      isGlobal: true,
    }),
    // CompetitorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

const modelManager = new ModelManagerService(new ConfigService());
modelManager.getLLM("test");
