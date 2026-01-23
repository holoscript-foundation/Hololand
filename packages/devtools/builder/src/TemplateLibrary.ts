import { logger } from './logger';
import { ALL_TEMPLATES } from './TemplateData';
import type { Template, TemplateCategory } from './types';

export class TemplateLibrary {
  private templates: Map<string, Template>;
  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
    logger.info('[TemplateLibrary] Initialized');
  }
  private initializeDefaultTemplates() {
    // Add default built-in
    this.addTemplate({
      id: 'coffee-shop',
      name: 'Coffee Shop',
      category: 'commerce',
      code: 'orb shop { type: "coffee" }',
      description: 'Basic coffee shop template'
    });

    // Add auto-ported templates from uaa2-service
    ALL_TEMPLATES.forEach(template => {
      this.addTemplate(template);
    });
    
    logger.info(`[TemplateLibrary] Loaded ${this.templates.size} templates total`);
  }
  addTemplate(template: Template): void {
    this.templates.set(template.id, template);
  }
  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }
  getTemplatesByCategory(category: TemplateCategory): Template[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }
  getAllTemplates(): Template[] {
    return Array.from(this.templates.values());
  }
}
