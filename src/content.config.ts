import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/engineering-notes' }),
  schema: z.object({
    title: z.string(), subtitle: z.string(), description: z.string(),
    seoTitle: z.string().optional(), noteNumber: z.number().int().positive().optional(),
    publicationDate: z.coerce.date(), updatedDate: z.coerce.date().optional(),
    category: z.string(), tags: z.array(z.string()), readingTime: z.string(), draft: z.boolean().default(false),
    coverImage: z.string().optional(), coverAlt: z.string().optional(), coverCaption: z.string().optional(),
    socialImage: z.string().optional(),
    listingImage: z.string().optional(), listingDescription: z.string().optional(),
    coverDisplay: z.boolean().default(true),
    socialTitle: z.string().optional(), socialDescription: z.string().optional(),
    video: z.object({
      name: z.string(),
      description: z.string(),
      contentUrl: z.string(),
      thumbnailUrl: z.string(),
      duration: z.string(),
    }).optional(),
  }),
});
export const collections = { notes };
