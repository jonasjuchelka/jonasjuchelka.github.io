# GitHub source synchronization

Target: https://github.com/jonasjuchelka/jonasjuchelka.github.io.git  
Review branch: `replit-website-sync`  
Pull-request base: `main`

## Initial comparison

The Replit workspace initially had only its internal backup remote, branch main and a clean worktree. The GitHub main branch contained only README.md, a generic index.html and `.github/workflows/static.yml`.

The GitHub remote was added as origin and fetched before changing files. Both existing histories are preserved by merging the GitHub main history into the source synchronization branch. The reviewed README is combined with the actual project documentation. The generic root index.html is retained unchanged as a historical placeholder; it is not a build input or a deployed page.

## Source versus deployed artifact

The repository receives the complete version-controlled project: both Next.js apps, shared libraries, original curated fonts and branding, source content, tests, lockfile, build configuration and documentation. Private-app **source code** is not a secret, but it must never be served by GitHub Pages. No database contents, real environment files, authentication tokens, raw 235 MB branding archive, dependencies or generated build output are included. `.env.example` contains blank values only.

The only Pages upload path is `artifacts/jonas-website/out`. It contains the public routes, static Next browser resources, four local fonts, SVG favicon/logo and font licenses. The public `/login/` page is an explanation/gateway, not the private Next runtime. Neither `/private`, account/admin APIs, SQL migrations, server modules nor `.env` files are deployment inputs.

The replaced static workflow uploaded `.`; this is unsafe once private-app source is in the repository. Its removal is intentional and occurs only after the real public build passes locally. New checks validate the exported tree and reject private roots, source/config files, symlinks and private implementation markers.

## Verification and publication

Local frozen-lockfile installation, both production builds, type checks, preview-origin regression test, Pages-export guard tests and existing authentication policy tests pass. The checked public export contains 61 files, approximately 2 MB. Full WebAuthn/device acceptance remains a separate, unfinished milestone.

PRs and branch pushes run checks and upload the public-only CI artifact but never deploy. A deployment requires a later, explicit manual workflow dispatch on main. This synchronization does not merge its PR, alter GitHub Pages settings, or publish the website.
