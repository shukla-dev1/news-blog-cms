import type { Core } from '@strapi/strapi';

/**
 * Anthropic API key — loaded via Strapi's env() so it matches the same .env resolution as database/server.
 */
export default ({ env }: Core.Config.Shared.ConfigParams) => ({
  apiKey: env('ANTHROPIC_API_KEY', ''),
});
