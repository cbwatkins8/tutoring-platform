import 'server-only';

import { pool } from './db';

export type SiteFeatures = {
  client_portal: boolean;
  online_booking: boolean;
};

export const DEFAULT_SITE_FEATURES: SiteFeatures = {
  client_portal: false,
  online_booking: false,
};

export async function getSiteFeatures(): Promise<SiteFeatures> {
  const { rows } = await pool.query<{ key: keyof SiteFeatures; enabled: boolean }>(
    `SELECT key, enabled FROM site_features
      WHERE key = ANY($1::text[])`,
    [Object.keys(DEFAULT_SITE_FEATURES)]
  );
  return rows.reduce(
    (features, row) => ({ ...features, [row.key]: row.enabled }),
    { ...DEFAULT_SITE_FEATURES }
  );
}

export async function isSiteFeatureEnabled(key: keyof SiteFeatures) {
  return (await getSiteFeatures())[key];
}
