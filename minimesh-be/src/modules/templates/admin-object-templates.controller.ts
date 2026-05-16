import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ZodError, ZodType } from 'zod';
import { SupabaseAuthGuard } from '../../common/auth/supabase-auth.guard';
import {
  CreateObjectTemplateSchema,
  SearchObjectTemplatesSchema,
  UpdateObjectTemplateSchema,
} from './dto/object-template.dto';
import { TemplatesService } from './templates.service';

@Controller('admin/object-templates')
@UseGuards(SupabaseAuthGuard)
export class AdminObjectTemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  listObjectTemplates() {
    return this.templatesService.listObjectTemplates();
  }

  @Post('search')
  searchObjectTemplates(@Body() body: unknown) {
    const input = this.validateBody(SearchObjectTemplatesSchema, body);
    return this.templatesService.searchObjectTemplates(
      input.query,
      input.limit,
    );
  }

  @Post()
  createObjectTemplate(@Body() body: unknown) {
    return this.templatesService.createObjectTemplate(
      this.validateBody(CreateObjectTemplateSchema, body),
    );
  }

  @Patch(':id')
  updateObjectTemplate(@Param('id') id: string, @Body() body: unknown) {
    return this.templatesService.updateObjectTemplate(
      id,
      this.validateBody(UpdateObjectTemplateSchema, body),
    );
  }

  @Delete(':id')
  deleteObjectTemplate(@Param('id') id: string) {
    return this.templatesService.deleteObjectTemplate(id);
  }

  private validateBody<T>(schema: ZodType<T>, body: unknown): T {
    try {
      return schema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          message: 'Invalid object template payload.',
          issues: error.issues,
        });
      }

      throw error;
    }
  }
}
