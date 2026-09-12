# AZAAD Public SEO & Search Visibility Go-Live Contract

## Objective
Make the public AZAAD clinic website discoverable and competitive in organic search across major search engines while protecting authenticated patient/staff surfaces from indexing.

## Canonical public surface
- Public website: `https://azaad-clinic-website.vercel.app/`
- Public homepage is indexable and followable.
- `robots.txt` publishes the sitemap location.
- `sitemap.xml` contains only public URLs.
- Canonical and Arabic/English hreflang metadata are emitted on the public homepage.
- Open Graph/Twitter metadata and MedicalBusiness JSON-LD are emitted on the public homepage.

## Security boundary
Authenticated patient and staff surfaces must not be indexed. In particular:
- `/patient.html` is `noindex, nofollow, noarchive, nosnippet` and is disallowed in `robots.txt`.
- `/admin.html`, staff dashboards, and `/api/` are excluded from crawler discovery.
- Patient-specific appointments, invoices, visits, follow-ups, identifiers, and other private data must never become public SEO content.

## Ranking objective
The engineering target is top organic visibility for relevant AZAAD/clinic/service queries, but search-engine ranking position is never treated as a guaranteed software property. Ranking depends on search-engine algorithms, competition, location, authority, content quality, technical health, and external signals.

## Required growth work after technical release
1. Verify sitemap and robots accessibility in Google Search Console and Bing Webmaster Tools.
2. Submit the canonical sitemap to both platforms.
3. Request indexing for the canonical public homepage after each material SEO release.
4. Keep Arabic and English content genuinely useful and indexable; do not generate keyword-stuffed or duplicated pages.
5. Add authoritative public service/location pages only when the clinic has real corresponding services and information.
6. Build legitimate local/medical authority signals and citations; never buy links or use manipulative SEO.
7. Monitor indexing coverage, Core Web Vitals, queries, impressions, clicks, CTR, and average position continuously.

## Release gate
SEO is `PROVEN` only when the deployed public URL returns successfully and the repository contains the canonical robots/sitemap/meta/structured-data contract. Search-engine ranking itself remains an operational KPI, not a binary CI pass/fail condition.
