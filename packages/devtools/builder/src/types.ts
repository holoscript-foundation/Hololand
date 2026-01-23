export interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  code: string;
  description?: string;
}
export type TemplateCategory = 'commerce' | 'workspace' | 'entertainment' | 'social';
