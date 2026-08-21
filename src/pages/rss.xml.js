import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { siteConfig } from '../config/site';
export async function GET(context){const notes=await getCollection('notes',({data})=>!data.draft);return rss({title:siteConfig.title,description:siteConfig.tagline,site:context.site??'https://example.invalid',items:notes.map(n=>({title:n.data.title,description:n.data.description,pubDate:n.data.publicationDate,link:`/engineering-notes/${n.id}`}))});}
