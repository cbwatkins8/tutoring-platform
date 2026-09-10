import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/profile', '/booking', '/tutor-dashboard', '/login', '/signup'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
