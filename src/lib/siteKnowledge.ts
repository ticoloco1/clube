/** JSON de conhecimento para prompts de IA (perfil + links + excerto CV). */

export type SiteKnowledgeInput = {
  site_name?: string | null;
  slug?: string | null;
  bio?: string | null;
  cv_headline?: string | null;
  cv_skills?: string[] | null;
  cv_location?: string | null;
  cv_content?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_search_tags?: string[] | null;
  /** E.164-style digits for visitor WhatsApp (mini_sites.contact_phone) */
  contact_whatsapp_digits?: string | null;
};

export type LinkRow = { title: string; url: string };

export function buildSiteKnowledgeJson(site: SiteKnowledgeInput, links: LinkRow[]): string {
  const payload = {
    profile: {
      site_name: site.site_name || '',
      slug: site.slug || '',
      bio: site.bio || '',
      cv_headline: site.cv_headline || '',
      seo: {
        title: site.seo_title || '',
        description: site.seo_description || '',
        search_tags: Array.isArray(site.seo_search_tags) ? site.seo_search_tags : [],
      },
    },
    links: links.slice(0, 40).map((l) => ({ title: l.title, url: l.url })),
    cv: {
      skills: Array.isArray(site.cv_skills) ? site.cv_skills : [],
      location: site.cv_location || '',
      content_excerpt:
        typeof site.cv_content === 'string' ? site.cv_content.replace(/<[^>]+>/g, ' ').slice(0, 2500) : '',
    },
    contact: {
      whatsapp_wa_me:
        site.contact_whatsapp_digits && site.contact_whatsapp_digits.length >= 8
          ? `https://wa.me/${site.contact_whatsapp_digits}`
          : '',
    },
  };
  return JSON.stringify(payload, null, 0);
}
