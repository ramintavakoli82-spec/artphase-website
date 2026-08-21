import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/engineering-notes' }),
  schema: z.object({
    title: z.string(), subtitle: z.string(), description: z.string(),
    publicationDate: z.coerce.date(), updatedDate: z.coerce.date().optional(),
    category: z.string(), tags: z.array(z.string()), readingTime: z.string(), draft: z.boolean().default(false),
  }),
});
export const collections = { notes };
