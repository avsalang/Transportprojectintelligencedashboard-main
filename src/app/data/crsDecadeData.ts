// Auto-generated from crs_transport_dashboard_ready.csv and second_pass_results_patched.csv
// Do not edit manually. Rebuild with build_crs_decade_dashboard_data.py.

export type CRSDecadeThemeId =
  | 'access_for_all'
  | 'low_zero_carbon_resilient_environment'
  | 'connectivity_logistics_efficiency'
  | 'urban_mobility_liveable_cities'
  | 'safe_and_secure'
  | 'science_technology_innovation'
;

export interface CRSDecadeRecord {
  row_number: number;
  year: number | null;
  donor: string;
  agency: string;
  recipient: string;
  recipient_scope: string;
  recipient_region_detail: string;
  region: string;
  mode: string;
  mode_detail: string;
  flow: string;
  commitment: number;
  disbursement: number;
  commitment_defl: number;
  disbursement_defl: number;
  title: string;
  short_description: string;
  long_description: string;
  purpose: string;
  climate_mitigation: number;
  climate_adaptation: number;
  gender: number;
  drr: number;
  biodiversity: number;
  environment: number;
  access_for_all: boolean;
  low_zero_carbon_resilient_environment: boolean;
  connectivity_logistics_efficiency: boolean;
  urban_mobility_liveable_cities: boolean;
  safe_and_secure: boolean;
  science_technology_innovation: boolean;
}

export interface CRSDecadeRecordIndex {
  version: number;
  totalRecords: number;
  chunks: Array<{ id: number; file: string; count: number; sizeBytes?: number }>;
}

export const CRS_DECADE_THEMES = [{"id":"access_for_all","label":"Access for All"},{"id":"low_zero_carbon_resilient_environment","label":"Low-/Zero-Carbon, Resilient & Environmental"},{"id":"connectivity_logistics_efficiency","label":"Connectivity, Logistics & Efficiency"},{"id":"urban_mobility_liveable_cities","label":"Urban Mobility & Liveable Cities"},{"id":"safe_and_secure","label":"Safe & Secure Transport"},{"id":"science_technology_innovation","label":"Science, Technology & Innovation"}] as const;
export const CRS_DECADE_STATS = {"recordCount":77571,"taggedRecordCount":44024,"themeCount":6};
