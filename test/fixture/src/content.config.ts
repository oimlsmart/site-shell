import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

// The minimal docs collection DocsSidebar consumes — three guides whose
// `order` is deliberately shuffled relative to their filenames, so the
// gate asserts docs-sort's ordering through the built page.
const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string().optional(),
    shortTitle: z.string().optional(),
    order: z.number().optional(),
  }),
})

export const collections = { docs }
