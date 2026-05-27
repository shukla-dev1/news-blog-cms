import type { Core } from '@strapi/strapi';

export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  apiKey: env('DEEPSEEK_API_KEY', ''),
  baseUrl: env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
  model: env('DEEPSEEK_MODEL', 'deepseek-chat'),
});
