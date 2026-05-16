import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './database/supabase/supabase.module';
import { GenerationModule } from './modules/generation/generation.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ScenesModule } from './modules/scenes/scenes.module';
import { TemplatesModule } from './modules/templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', 'minimesh-be/.env'],
      isGlobal: true,
    }),
    SupabaseModule,
    GenerationModule,
    ProjectsModule,
    ScenesModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
