import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const demos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/demos' }),
  schema: z.object({
    order: z.number(),
    title: z.string(),
    industry: z.string(),
    slug: z.string(),
    tagline: z.string(),
    description: z.string().optional(),
    cta: z.string().optional(),
    features: z.array(z.string()).optional(),
    palette: z.array(z.string()),
    accent: z.string(),
    seoTitle: z.string().optional(),
    seoDescription: z.string().optional(),
    ogImage: z.string().optional(),
  }),
});

export const collections = { demos };
