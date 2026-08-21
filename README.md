# Ramin Tavakoli — Engineering Notes

Version 0.1 of a personal engineering knowledge base built with Astro, TypeScript and MDX.

## 1. Run the site locally

Open a terminal in the `Website develop` folder, then run:

```powershell
pnpm install
pnpm dev
```

Open `http://localhost:4321` in your browser.

## 2. Stop the site

Click the terminal and press `Ctrl+C`.

## 3. Add a new Engineering Note

Copy the sample file in `src/content/engineering-notes/`, rename it with a short URL-friendly name, and change its frontmatter and content. For example, `motor-starting-voltage-drop.mdx` becomes `/engineering-notes/motor-starting-voltage-drop`.

## 4. Add an image

Put the file in `public/images/engineering-notes/your-article-name/`. Then use:

```mdx
<Figure number="1" src="/images/engineering-notes/your-article-name/diagram.png" alt="Description of the diagram" caption="Your figure caption." />
```

Omit `src` to display a labelled placeholder while an illustration is being prepared.

## 5. Add a table

Use the reusable `EngineeringTable` component. Copy the example in the sample article and replace its caption, headings and cells. Tables scroll horizontally on small screens.

## 6. Add an equation

Inline equation: `$I = V/Z$`. Display equation:

```mdx
<EquationBlock label="1">
$$ P = \sqrt{3} V I \cos\phi $$
</EquationBlock>
```

## 7. Change the homepage text

Edit `src/config/site.ts` for the title, tagline and introduction. Edit `src/pages/index.astro` for section-specific wording.

## 8. Change navigation

Edit the `navigation` list in `src/config/site.ts`. Future sections such as Tools, Calculators, Resources, Downloads, Projects and Contact can be added there when their pages are ready.

## 9. Build the production version

```powershell
pnpm build
```

The finished static website is written to `dist/`.

## 10. Add a future domain

Enter the full domain (for example, `https://example.com`) in the `domain` field in `src/config/site.ts`. Also add the same value as `site` in `astro.config.mjs` so sitemap and canonical URLs use it.

## Main folders

- `src/content/engineering-notes/` — article files
- `src/components/` — reusable technical-document components
- `src/layouts/` — shared page and article layouts
- `src/pages/` — website routes
- `src/config/site.ts` — site identity, navigation and future domain
- `public/images/engineering-notes/` — article images and diagrams
- `public/downloads/` — future downloadable files
