// Auto-generated from crs_transport_dashboard_ready.csv
// Do not edit manually. Rebuild with build_crs_dashboard_data.py.

export interface CRSFact {
  year: number;
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
  count: number;
  commitment_defl?: number;
  disbursement_defl?: number;
  gender?: number;
  climate_mitigation?: number;
  climate_adaptation?: number;
  drr?: number;
  biodiversity?: number;
  environment?: number;
}

export interface CRSRecipientSummary {
  recipient: string;
  recipient_scope: string;
  region: string;
  recipient_region_detail: string;
  commitment: number;
  disbursement: number;
  count: number;
  lat: number | null;
  lng: number | null;
}

export interface CRSCountryRecord {
  year: number | null;
  donor: string;
  agency: string;
  recipient: string;
  region: string;
  mode: string;
  mode_detail: string;
  flow: string;
  commitment: number;
  disbursement: number;
  commitment_defl?: number;
  disbursement_defl?: number;
  title: string;
  description: string;
  climate_mitigation?: number;
  climate_adaptation?: number;
  gender?: number;
  drr?: number;
  biodiversity?: number;
  environment?: number;
}

export const CRS_MODE_COLORS: Record<string, string> = {
  "Road": "#F59E0B",
  "Rail": "#2563EB",
  "Water": "#06B6D4",
  "Aviation": "#8B5CF6",
  "Other": "#64748B"
};
export const CRS_FACTS_URL = './data/crs-facts.json';
export const CRS_COUNTRY_MAP_POINTS: CRSRecipientSummary[] = [
  {
    "recipient": "India",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 103079.17,
    "disbursement": 62480.25,
    "count": 6784,
    "lat": 22.986653,
    "lng": 80.866737
  },
  {
    "recipient": "People's Republic of China",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 57764.94,
    "disbursement": 33333.61,
    "count": 10106,
    "lat": 32.925702,
    "lng": 110.57119
  },
  {
    "recipient": "Philippines",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 35938.75,
    "disbursement": 14408.58,
    "count": 5751,
    "lat": 12.363887,
    "lng": 122.179578
  },
  {
    "recipient": "Bangladesh",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 30174.8,
    "disbursement": 13427.7,
    "count": 3935,
    "lat": 23.494396,
    "lng": 90.606515
  },
  {
    "recipient": "Indonesia",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 29180.19,
    "disbursement": 14196.64,
    "count": 8041,
    "lat": -3.064062,
    "lng": 110.345586
  },
  {
    "recipient": "Brazil",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 27665.74,
    "disbursement": 16844.25,
    "count": 3020,
    "lat": -17.8226,
    "lng": -46.875556
  },
  {
    "recipient": "Viet Nam",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 26846.28,
    "disbursement": 18963.64,
    "count": 6138,
    "lat": 16.089725,
    "lng": 106.552111
  },
  {
    "recipient": "Türkiye",
    "recipient_scope": "economy",
    "region": "Europe",
    "recipient_region_detail": "",
    "commitment": 23063.32,
    "disbursement": 14590.67,
    "count": 1836,
    "lat": 38.853156,
    "lng": 32.868827
  },
  {
    "recipient": "Egypt",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 16250.18,
    "disbursement": 8722.74,
    "count": 2841,
    "lat": 29.842682,
    "lng": 31.077519
  },
  {
    "recipient": "Morocco",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 15128.44,
    "disbursement": 11023.67,
    "count": 3485,
    "lat": 33.060258,
    "lng": -6.109608
  },
  {
    "recipient": "Thailand",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 14463.21,
    "disbursement": 8868.41,
    "count": 2081,
    "lat": 12.978909,
    "lng": 101.066679
  },
  {
    "recipient": "Kazakhstan",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 13478.26,
    "disbursement": 7933.9,
    "count": 898,
    "lat": 46.788829,
    "lng": 66.119443
  },
  {
    "recipient": "Pakistan",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 12976.91,
    "disbursement": 5824.52,
    "count": 2781,
    "lat": 30.403963,
    "lng": 70.305135
  },
  {
    "recipient": "Argentina",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 11663.52,
    "disbursement": 6732.38,
    "count": 1069,
    "lat": -32.647571,
    "lng": -60.799201
  },
  {
    "recipient": "Tanzania, United Republic of",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 10322.86,
    "disbursement": 6120.02,
    "count": 3312,
    "lat": -6.314787,
    "lng": 37.107575
  },
  {
    "recipient": "Kenya",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 9698.92,
    "disbursement": 5813.97,
    "count": 3381,
    "lat": -0.375081,
    "lng": 36.960861
  },
  {
    "recipient": "Sri Lanka",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 9083.14,
    "disbursement": 5984.79,
    "count": 3075,
    "lat": 7.628616,
    "lng": 80.478213
  },
  {
    "recipient": "Colombia",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 8800.65,
    "disbursement": 4032.47,
    "count": 1287,
    "lat": 5.140037,
    "lng": -74.347536
  },
  {
    "recipient": "Ukraine",
    "recipient_scope": "economy",
    "region": "Europe",
    "recipient_region_detail": "",
    "commitment": 8173.45,
    "disbursement": 5010.83,
    "count": 758,
    "lat": 48.865724,
    "lng": 33.351663
  },
  {
    "recipient": "Afghanistan",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 8037.03,
    "disbursement": 5978.91,
    "count": 1504,
    "lat": 35.064041,
    "lng": 67.853448
  },
  {
    "recipient": "Ethiopia",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 7524.26,
    "disbursement": 4987.13,
    "count": 1918,
    "lat": 9.488295,
    "lng": 38.472824
  },
  {
    "recipient": "Tunisia",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 7030.35,
    "disbursement": 4553.59,
    "count": 2010,
    "lat": 35.501643,
    "lng": 9.806053
  },
  {
    "recipient": "Peru",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 6703.44,
    "disbursement": 1954.5,
    "count": 1147,
    "lat": -11.710142,
    "lng": -75.20148
  },
  {
    "recipient": "Cameroon",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 6379.43,
    "disbursement": 3121.21,
    "count": 2620,
    "lat": 6.598902,
    "lng": 12.430542
  },
  {
    "recipient": "Senegal",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 6119.78,
    "disbursement": 3714.79,
    "count": 2023,
    "lat": 14.553089,
    "lng": -16.265014
  },
  {
    "recipient": "Côte d'Ivoire",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 6014.96,
    "disbursement": 2437.15,
    "count": 1550,
    "lat": 6.672494,
    "lng": -5.068144
  },
  {
    "recipient": "Uganda",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 5915.07,
    "disbursement": 3286.31,
    "count": 1908,
    "lat": 0.996364,
    "lng": 32.06724
  },
  {
    "recipient": "Uzbekistan",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 5853.15,
    "disbursement": 2614.29,
    "count": 841,
    "lat": 40.270932,
    "lng": 66.428645
  },
  {
    "recipient": "Congo, the Democratic Republic of the",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 5543.64,
    "disbursement": 3166.91,
    "count": 1987,
    "lat": -3.345642,
    "lng": 21.838236
  },
  {
    "recipient": "Mozambique",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 5475.21,
    "disbursement": 3404.63,
    "count": 2389,
    "lat": -18.884247,
    "lng": 35.817246
  },
  {
    "recipient": "Serbia",
    "recipient_scope": "economy",
    "region": "Europe",
    "recipient_region_detail": "",
    "commitment": 5463.69,
    "disbursement": 3780.18,
    "count": 1069,
    "lat": 44.129908,
    "lng": 20.904232
  },
  {
    "recipient": "Papua New Guinea",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 5368.24,
    "disbursement": 3905.85,
    "count": 1798,
    "lat": -7.382595,
    "lng": 147.667562
  },
  {
    "recipient": "Mexico",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 5190.02,
    "disbursement": 2077.72,
    "count": 989,
    "lat": 22.122288,
    "lng": -100.351631
  },
  {
    "recipient": "Cambodia",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 5189.46,
    "disbursement": 2981.86,
    "count": 2013,
    "lat": 12.504482,
    "lng": 104.431196
  },
  {
    "recipient": "Myanmar",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 4992.29,
    "disbursement": 2306.35,
    "count": 1538,
    "lat": 18.506501,
    "lng": 96.35108
  },
  {
    "recipient": "Ghana",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 4966.81,
    "disbursement": 3283.06,
    "count": 2333,
    "lat": 6.747675,
    "lng": -0.838439
  },
  {
    "recipient": "Georgia",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 4800.75,
    "disbursement": 3852.3,
    "count": 1299,
    "lat": 41.518197,
    "lng": 37.792482
  },
  {
    "recipient": "Bolivia (Plurinational State of)",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 4628.8,
    "disbursement": 2193.1,
    "count": 1216,
    "lat": -16.865041,
    "lng": -65.565058
  },
  {
    "recipient": "Nepal",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 4598.56,
    "disbursement": 2187.05,
    "count": 2067,
    "lat": 27.911622,
    "lng": 84.167517
  },
  {
    "recipient": "Azerbaijan",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 4567.47,
    "disbursement": 3841.83,
    "count": 752,
    "lat": 40.113873,
    "lng": 48.777097
  },
  {
    "recipient": "Ecuador",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 4317.21,
    "disbursement": 2265.73,
    "count": 750,
    "lat": -1.063067,
    "lng": -79.12469
  },
  {
    "recipient": "Paraguay",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 3717.38,
    "disbursement": 1667.15,
    "count": 786,
    "lat": -25.574362,
    "lng": -56.80357
  },
  {
    "recipient": "Madagascar",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 3659.78,
    "disbursement": 2295.35,
    "count": 2092,
    "lat": -19.359268,
    "lng": 47.516835
  },
  {
    "recipient": "Panama",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 3600.39,
    "disbursement": 2945.73,
    "count": 533,
    "lat": 9.075931,
    "lng": -79.785855
  },
  {
    "recipient": "Bosnia and Herzegovina",
    "recipient_scope": "economy",
    "region": "Europe",
    "recipient_region_detail": "",
    "commitment": 3518.42,
    "disbursement": 3448.64,
    "count": 905,
    "lat": 44.151661,
    "lng": 17.798111
  },
  {
    "recipient": "El Salvador",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 3245.31,
    "disbursement": 1163.88,
    "count": 646,
    "lat": 13.750092,
    "lng": -89.057359
  },
  {
    "recipient": "Nigeria",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 3213.14,
    "disbursement": 1810.57,
    "count": 1148,
    "lat": 8.323178,
    "lng": 6.946137
  },
  {
    "recipient": "Burkina Faso",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 3205.34,
    "disbursement": 1672.43,
    "count": 1564,
    "lat": 11.783282,
    "lng": -2.005302
  },
  {
    "recipient": "Honduras",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 3205.16,
    "disbursement": 1523.95,
    "count": 1099,
    "lat": 15.132307,
    "lng": -87.17735
  },
  {
    "recipient": "Dominican Republic",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 2957.04,
    "disbursement": 1476.75,
    "count": 549,
    "lat": 18.904841,
    "lng": -70.881077
  },
  {
    "recipient": "Costa Rica",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 2832.63,
    "disbursement": 1068.47,
    "count": 488,
    "lat": 9.819189,
    "lng": -83.65967
  },
  {
    "recipient": "Nicaragua",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 2662.28,
    "disbursement": 2652.78,
    "count": 1085,
    "lat": 12.313123,
    "lng": -85.794814
  },
  {
    "recipient": "Zambia",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 2599.01,
    "disbursement": 1578.11,
    "count": 1451,
    "lat": -14.018407,
    "lng": 29.021419
  },
  {
    "recipient": "Iraq",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 2572.96,
    "disbursement": 2557.15,
    "count": 900,
    "lat": 33.211764,
    "lng": 44.704416
  },
  {
    "recipient": "Mongolia",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 2505.82,
    "disbursement": 1697.52,
    "count": 1235,
    "lat": 47.240888,
    "lng": 105.664943
  },
  {
    "recipient": "Lao People's Democratic Republic",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 2469.59,
    "disbursement": 1744.01,
    "count": 1724,
    "lat": 18.347074,
    "lng": 103.652776
  },
  {
    "recipient": "Mali",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 2385.75,
    "disbursement": 1405.06,
    "count": 1354,
    "lat": 13.763165,
    "lng": -6.074752
  },
  {
    "recipient": "Haiti",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 2359.89,
    "disbursement": 1452.55,
    "count": 884,
    "lat": 18.85485,
    "lng": -72.542004
  },
  {
    "recipient": "Gabon",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 2248.88,
    "disbursement": 896.95,
    "count": 549,
    "lat": -0.615062,
    "lng": 11.029406
  },
  {
    "recipient": "Benin",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 2168.94,
    "disbursement": 1504.72,
    "count": 1425,
    "lat": 8.262583,
    "lng": 2.321822
  },
  {
    "recipient": "South Africa",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 2168.72,
    "disbursement": 1701.5,
    "count": 318,
    "lat": -28.76823,
    "lng": 17.059549
  },
  {
    "recipient": "Malawi",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 2149.66,
    "disbursement": 1077.03,
    "count": 1340,
    "lat": -14.354654,
    "lng": 34.587286
  },
  {
    "recipient": "Niger",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 2133.72,
    "disbursement": 1004.85,
    "count": 1014,
    "lat": 14.852781,
    "lng": 6.839688
  },
  {
    "recipient": "Rwanda",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 2127.67,
    "disbursement": 1185.04,
    "count": 1141,
    "lat": -1.959182,
    "lng": 29.818447
  },
  {
    "recipient": "Guinea",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 2111.83,
    "disbursement": 911.45,
    "count": 1446,
    "lat": 10.342715,
    "lng": -11.409859
  },
  {
    "recipient": "Jordan",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 2013.79,
    "disbursement": 1387.62,
    "count": 970,
    "lat": 31.83235,
    "lng": 36.019541
  },
  {
    "recipient": "Chad",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 1987.2,
    "disbursement": 821.78,
    "count": 1087,
    "lat": 11.333302,
    "lng": 17.013386
  },
  {
    "recipient": "Yemen",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 1985.56,
    "disbursement": 987.44,
    "count": 1225,
    "lat": 14.441747,
    "lng": 45.235042
  },
  {
    "recipient": "North Macedonia",
    "recipient_scope": "economy",
    "region": "Europe",
    "recipient_region_detail": "",
    "commitment": 1974.29,
    "disbursement": 1265.84,
    "count": 487,
    "lat": 41.811369,
    "lng": 21.867575
  },
  {
    "recipient": "Tajikistan",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 1944.84,
    "disbursement": 1291.08,
    "count": 837,
    "lat": 38.606684,
    "lng": 69.347569
  },
  {
    "recipient": "Albania",
    "recipient_scope": "economy",
    "region": "Europe",
    "recipient_region_detail": "",
    "commitment": 1938.94,
    "disbursement": 1349.14,
    "count": 1497,
    "lat": 40.960778,
    "lng": 19.932264
  },
  {
    "recipient": "Liberia",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 1890.22,
    "disbursement": 1439.65,
    "count": 940,
    "lat": 6.46642,
    "lng": -9.76041
  },
  {
    "recipient": "Chile",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 1782.3,
    "disbursement": 456.95,
    "count": 392,
    "lat": -35.47423,
    "lng": -71.54908
  },
  {
    "recipient": "Armenia",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 1644.34,
    "disbursement": 1128.05,
    "count": 721,
    "lat": 40.071525,
    "lng": 45.045449
  },
  {
    "recipient": "Sudan",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 1610.08,
    "disbursement": 507.72,
    "count": 579,
    "lat": 11.999087,
    "lng": 32.032279
  },
  {
    "recipient": "Kyrgyz Republic",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 1597.96,
    "disbursement": 919.05,
    "count": 1001,
    "lat": 41.639261,
    "lng": 74.565775
  },
  {
    "recipient": "Uruguay",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 1579.38,
    "disbursement": 649.47,
    "count": 280,
    "lat": -34.903278,
    "lng": -56.18816
  },
  {
    "recipient": "Republic of Moldova",
    "recipient_scope": "economy",
    "region": "Europe",
    "recipient_region_detail": "",
    "commitment": 1535.39,
    "disbursement": 1047.12,
    "count": 358,
    "lat": 47.290601,
    "lng": 28.387143
  },
  {
    "recipient": "Togo",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 1495.11,
    "disbursement": 575.04,
    "count": 738,
    "lat": 7.313423,
    "lng": 1.146003
  },
  {
    "recipient": "Lebanon",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 1475.72,
    "disbursement": 945.58,
    "count": 986,
    "lat": 33.838159,
    "lng": 35.614887
  },
  {
    "recipient": "Sierra Leone",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 1425.48,
    "disbursement": 768.26,
    "count": 989,
    "lat": 8.506738,
    "lng": -12.14303
  },
  {
    "recipient": "Guatemala",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 1385.41,
    "disbursement": 582.66,
    "count": 679,
    "lat": 15.303181,
    "lng": -90.85818
  },
  {
    "recipient": "Central African Republic",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 1316.13,
    "disbursement": 636.4,
    "count": 742,
    "lat": 6.6394,
    "lng": 19.315341
  },
  {
    "recipient": "Mauritania",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 1213.02,
    "disbursement": 811.28,
    "count": 1184,
    "lat": 18.298917,
    "lng": -13.603761
  },
  {
    "recipient": "Djibouti",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 1137.77,
    "disbursement": 634.53,
    "count": 714,
    "lat": 11.564404,
    "lng": 42.825219
  },
  {
    "recipient": "Marshall Islands",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 1112.89,
    "disbursement": 911.77,
    "count": 175,
    "lat": 7.277766,
    "lng": 170.847504
  },
  {
    "recipient": "Burundi",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 1102.67,
    "disbursement": 678.35,
    "count": 690,
    "lat": -3.401658,
    "lng": 29.672233
  },
  {
    "recipient": "Croatia",
    "recipient_scope": "economy",
    "region": "Europe",
    "recipient_region_detail": "",
    "commitment": 1072.01,
    "disbursement": 502.41,
    "count": 228,
    "lat": 45.025469,
    "lng": 15.690565
  },
  {
    "recipient": "Maldives",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 998.48,
    "disbursement": 524.35,
    "count": 400,
    "lat": 6.626163,
    "lng": 73.067091
  },
  {
    "recipient": "Congo",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 992.16,
    "disbursement": 484.13,
    "count": 699,
    "lat": -3.126623,
    "lng": 13.842144
  },
  {
    "recipient": "Jamaica",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 976.69,
    "disbursement": 525.72,
    "count": 785,
    "lat": 18.109087,
    "lng": -77.235013
  },
  {
    "recipient": "Timor-Leste",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 956.26,
    "disbursement": 627.37,
    "count": 703,
    "lat": -8.720134,
    "lng": 125.836836
  },
  {
    "recipient": "Cabo Verde",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 894.81,
    "disbursement": 736.64,
    "count": 1186,
    "lat": 15.95836,
    "lng": -24.066657
  },
  {
    "recipient": "Guyana",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 887.98,
    "disbursement": 209.55,
    "count": 293,
    "lat": 6.288485,
    "lng": -58.113664
  },
  {
    "recipient": "Turkmenistan",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 790.98,
    "disbursement": 222.44,
    "count": 206,
    "lat": 39.076436,
    "lng": 55.60014
  },
  {
    "recipient": "Botswana",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 723.8,
    "disbursement": 330.35,
    "count": 503,
    "lat": -24.706525,
    "lng": 25.255876
  },
  {
    "recipient": "Gambia",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 715.76,
    "disbursement": 508.33,
    "count": 531,
    "lat": 13.437405,
    "lng": -15.634184
  },
  {
    "recipient": "Solomon Islands",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 691.56,
    "disbursement": 538.31,
    "count": 711,
    "lat": -9.134811,
    "lng": 159.857812
  },
  {
    "recipient": "Somalia",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 637.08,
    "disbursement": 329.39,
    "count": 340,
    "lat": 5.129399,
    "lng": 46.333489
  },
  {
    "recipient": "Vanuatu",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 635.65,
    "disbursement": 469.83,
    "count": 634,
    "lat": -17.077427,
    "lng": 168.072256
  },
  {
    "recipient": "Fiji",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 603.38,
    "disbursement": 246.68,
    "count": 389,
    "lat": -17.839101,
    "lng": 178.086098
  },
  {
    "recipient": "Belarus",
    "recipient_scope": "economy",
    "region": "Europe",
    "recipient_region_detail": "",
    "commitment": 603.0,
    "disbursement": 508.33,
    "count": 82,
    "lat": 53.469371,
    "lng": 27.701843
  },
  {
    "recipient": "Angola",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 573.49,
    "disbursement": 388.26,
    "count": 572,
    "lat": -9.968213,
    "lng": 16.454965
  },
  {
    "recipient": "Mauritius",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 543.26,
    "disbursement": 269.19,
    "count": 452,
    "lat": -19.935862,
    "lng": 60.490892
  },
  {
    "recipient": "Samoa",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 537.76,
    "disbursement": 309.21,
    "count": 558,
    "lat": -13.834293,
    "lng": -171.860004
  },
  {
    "recipient": "Belize",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 466.1,
    "disbursement": 237.45,
    "count": 468,
    "lat": 17.473618,
    "lng": -88.545548
  },
  {
    "recipient": "Dominica",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 463.18,
    "disbursement": 106.66,
    "count": 332,
    "lat": 15.445874,
    "lng": -61.351419
  },
  {
    "recipient": "South Sudan",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 461.51,
    "disbursement": 331.73,
    "count": 304,
    "lat": 6.48698,
    "lng": 30.460629
  },
  {
    "recipient": "Lesotho",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 456.18,
    "disbursement": 194.52,
    "count": 742,
    "lat": -29.514725,
    "lng": 28.170956
  },
  {
    "recipient": "Kiribati",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 408.23,
    "disbursement": 241.21,
    "count": 308,
    "lat": 1.231141,
    "lng": 107.199773
  },
  {
    "recipient": "Guinea-Bissau",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 378.41,
    "disbursement": 167.72,
    "count": 447,
    "lat": 12.033731,
    "lng": -15.621899
  },
  {
    "recipient": "Eswatini",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 377.02,
    "disbursement": 318.58,
    "count": 606,
    "lat": -26.525394,
    "lng": 31.433833
  },
  {
    "recipient": "Oman",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 376.77,
    "disbursement": 222.66,
    "count": 48,
    "lat": 19.639482,
    "lng": 57.677911
  },
  {
    "recipient": "Tonga",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 346.35,
    "disbursement": 213.47,
    "count": 439,
    "lat": -20.006705,
    "lng": -174.765753
  },
  {
    "recipient": "Comoros",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 345.14,
    "disbursement": 168.72,
    "count": 430,
    "lat": -12.142287,
    "lng": 43.941037
  },
  {
    "recipient": "Bhutan",
    "recipient_scope": "economy",
    "region": "Asia",
    "recipient_region_detail": "",
    "commitment": 326.17,
    "disbursement": 301.43,
    "count": 552,
    "lat": 27.232189,
    "lng": 89.995252
  },
  {
    "recipient": "Tuvalu",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 302.68,
    "disbursement": 116.64,
    "count": 197,
    "lat": -7.975008,
    "lng": 178.482293
  },
  {
    "recipient": "Micronesia (Federated States of)",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 264.74,
    "disbursement": 106.37,
    "count": 145,
    "lat": 7.330033,
    "lng": 152.077054
  },
  {
    "recipient": "Saint Lucia",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 168.13,
    "disbursement": 39.67,
    "count": 302,
    "lat": 13.898748,
    "lng": -60.966303
  },
  {
    "recipient": "Eritrea",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 159.76,
    "disbursement": 67.73,
    "count": 150,
    "lat": 14.717257,
    "lng": 40.55786
  },
  {
    "recipient": "Saint Vincent and the Grenadines",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 152.2,
    "disbursement": 29.85,
    "count": 166,
    "lat": 13.23094,
    "lng": -61.204975
  },
  {
    "recipient": "Sao Tome and Principe",
    "recipient_scope": "economy",
    "region": "Africa",
    "recipient_region_detail": "",
    "commitment": 133.25,
    "disbursement": 87.86,
    "count": 266,
    "lat": 0.443306,
    "lng": 6.674894
  },
  {
    "recipient": "Barbados",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 121.95,
    "disbursement": 1.62,
    "count": 34,
    "lat": 13.16453,
    "lng": -59.55165
  },
  {
    "recipient": "Grenada",
    "recipient_scope": "economy",
    "region": "Americas",
    "recipient_region_detail": "",
    "commitment": 115.19,
    "disbursement": 39.31,
    "count": 270,
    "lat": 12.1161,
    "lng": -61.694264
  },
  {
    "recipient": "Cook Islands",
    "recipient_scope": "economy",
    "region": "Oceania",
    "recipient_region_detail": "",
    "commitment": 31.83,
    "disbursement": 29.89,
    "count": 96,
    "lat": -21.205982,
    "lng": -159.786433
  }
];
export const CRS_DONOR_OPTIONS = [
  "Adaptation Fund",
  "Asian Development Bank",
  "Asian Infrastructure Investment Bank",
  "Australia",
  "Austria",
  "Azerbaijan",
  "Belgium",
  "Black Sea Trade & Development Bank",
  "Bloomberg Family Foundation",
  "Canada",
  "Children's Investment Fund Foundation",
  "Climate Investment Funds",
  "Council of Europe Development Bank",
  "Czechia",
  "David and Lucile Packard Foundation",
  "Denmark",
  "Eurasian Fund for Stabilization and Development",
  "European Bank for Reconstruction and Development",
  "European Union Institutions",
  "Finland",
  "France",
  "Germany",
  "Global Environment Facility",
  "Global Green Growth Institute",
  "Greece",
  "Green Climate Fund",
  "Hungary",
  "IFAD",
  "IKEA Foundation",
  "International Bank for Reconstruction and Development",
  "International Development Association",
  "International Finance Corporation",
  "Ireland",
  "Islamic Development Bank",
  "Italy",
  "Japan",
  "John D. and Catherine T. MacArthur Foundation",
  "Kazakhstan",
  "Kuwait",
  "Lithuania",
  "Netherlands",
  "New Development Bank",
  "New Zealand",
  "Nordic Development Fund",
  "Norway",
  "OPEC Fund for International Development",
  "Oak Foundation",
  "Poland",
  "Portugal",
  "Private Infrastructure Development Group",
  "Republic of Korea",
  "Saudi Arabia",
  "Slovakia",
  "Spain",
  "Sweden",
  "Switzerland",
  "Taipei,China",
  "Thailand",
  "Türkiye",
  "UNDP",
  "UNECE",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "WFP",
  "William and Flora Hewlett Foundation"
];
export const CRS_MODE_OPTIONS = [
  "Aviation",
  "Other",
  "Rail",
  "Road",
  "Water"
];
export const CRS_DEFAULT_OVERVIEW = {
  "stats": {
    "commitment": 422937.6111,
    "disbursement": 240481.421,
    "commitment_defl": 473272.3079,
    "disbursement_defl": 245134.3118,
    "count": 77571,
    "donorCount": 66,
    "recipientCount": 50,
    "countryRecipientCount": 45,
    "regionalRecipientCount": 5,
    "sustainableCommitment": 175066.145,
    "sustainableCommitmentDefl": 164666.9817,
    "sustainableCount": 23788
  },
  "countryPoints": [
    {
      "recipient": "India",
      "region": "Asia",
      "commitment": 103079.1704,
      "disbursement": 62480.2478,
      "commitment_defl": 109969.4002,
      "disbursement_defl": 61386.3938,
      "count": 6784,
      "lat": 22.986653,
      "lng": 80.866737
    },
    {
      "recipient": "People's Republic of China",
      "region": "Asia",
      "commitment": 57764.9348,
      "disbursement": 33333.6142,
      "commitment_defl": 72775.1841,
      "disbursement_defl": 38246.8304,
      "count": 10106,
      "lat": 32.925702,
      "lng": 110.57119
    },
    {
      "recipient": "Philippines",
      "region": "Asia",
      "commitment": 35938.7501,
      "disbursement": 14408.5773,
      "commitment_defl": 35513.5831,
      "disbursement_defl": 13068.045,
      "count": 5751,
      "lat": 12.363887,
      "lng": 122.179578
    },
    {
      "recipient": "Bangladesh",
      "region": "Asia",
      "commitment": 30174.7988,
      "disbursement": 13427.6974,
      "commitment_defl": 32294.6067,
      "disbursement_defl": 13244.2138,
      "count": 3935,
      "lat": 23.494396,
      "lng": 90.606515
    },
    {
      "recipient": "Indonesia",
      "region": "Asia",
      "commitment": 29180.1864,
      "disbursement": 14196.6379,
      "commitment_defl": 37484.0077,
      "disbursement_defl": 15536.2699,
      "count": 8041,
      "lat": -3.064062,
      "lng": 110.345586
    },
    {
      "recipient": "Viet Nam",
      "region": "Asia",
      "commitment": 26846.2812,
      "disbursement": 18963.6361,
      "commitment_defl": 25376.9526,
      "disbursement_defl": 17451.7599,
      "count": 6138,
      "lat": 16.089725,
      "lng": 106.552111
    },
    {
      "recipient": "Türkiye",
      "region": "Europe",
      "commitment": 23063.322,
      "disbursement": 14590.672,
      "commitment_defl": 26227.7032,
      "disbursement_defl": 15398.2001,
      "count": 1836,
      "lat": 38.853156,
      "lng": 32.868827
    },
    {
      "recipient": "Thailand",
      "region": "Asia",
      "commitment": 14463.2084,
      "disbursement": 8868.4086,
      "commitment_defl": 14511.6832,
      "disbursement_defl": 7019.5015,
      "count": 2081,
      "lat": 12.978909,
      "lng": 101.066679
    },
    {
      "recipient": "Kazakhstan",
      "region": "Asia",
      "commitment": 13478.2627,
      "disbursement": 7933.9013,
      "commitment_defl": 14788.7626,
      "disbursement_defl": 8505.4201,
      "count": 898,
      "lat": 46.788829,
      "lng": 66.119443
    },
    {
      "recipient": "Pakistan",
      "region": "Asia",
      "commitment": 12976.914,
      "disbursement": 5824.5189,
      "commitment_defl": 15889.2063,
      "disbursement_defl": 6188.8293,
      "count": 2781,
      "lat": 30.403963,
      "lng": 70.305135
    },
    {
      "recipient": "Sri Lanka",
      "region": "Asia",
      "commitment": 9083.1385,
      "disbursement": 5984.7873,
      "commitment_defl": 9245.2474,
      "disbursement_defl": 5670.1401,
      "count": 3075,
      "lat": 7.628616,
      "lng": 80.478213
    },
    {
      "recipient": "Afghanistan",
      "region": "Asia",
      "commitment": 8037.0254,
      "disbursement": 5978.9064,
      "commitment_defl": 10070.0524,
      "disbursement_defl": 7380.2703,
      "count": 1504,
      "lat": 35.064041,
      "lng": 67.853448
    },
    {
      "recipient": "Uzbekistan",
      "region": "Asia",
      "commitment": 5853.1478,
      "disbursement": 2614.2923,
      "commitment_defl": 6204.0117,
      "disbursement_defl": 2703.15,
      "count": 841,
      "lat": 40.270932,
      "lng": 66.428645
    },
    {
      "recipient": "Papua New Guinea",
      "region": "Oceania",
      "commitment": 5368.2438,
      "disbursement": 3905.8531,
      "commitment_defl": 6787.8043,
      "disbursement_defl": 4388.7928,
      "count": 1798,
      "lat": -7.382595,
      "lng": 147.667562
    },
    {
      "recipient": "Cambodia",
      "region": "Asia",
      "commitment": 5189.4624,
      "disbursement": 2981.8649,
      "commitment_defl": 4974.8457,
      "disbursement_defl": 2853.8178,
      "count": 2013,
      "lat": 12.504482,
      "lng": 104.431196
    },
    {
      "recipient": "Myanmar",
      "region": "Asia",
      "commitment": 4992.2869,
      "disbursement": 2306.3507,
      "commitment_defl": 5620.2419,
      "disbursement_defl": 2341.8001,
      "count": 1538,
      "lat": 18.506501,
      "lng": 96.35108
    },
    {
      "recipient": "Georgia",
      "region": "Asia",
      "commitment": 4800.7504,
      "disbursement": 3852.2998,
      "commitment_defl": 5418.4417,
      "disbursement_defl": 4219.9996,
      "count": 1299,
      "lat": 41.518197,
      "lng": 37.792482
    },
    {
      "recipient": "Nepal",
      "region": "Asia",
      "commitment": 4598.5562,
      "disbursement": 2187.0498,
      "commitment_defl": 5947.665,
      "disbursement_defl": 2294.0335,
      "count": 2067,
      "lat": 27.911622,
      "lng": 84.167517
    },
    {
      "recipient": "Azerbaijan",
      "region": "Asia",
      "commitment": 4567.4714,
      "disbursement": 3841.8304,
      "commitment_defl": 5072.0947,
      "disbursement_defl": 4271.0715,
      "count": 752,
      "lat": 40.113873,
      "lng": 48.777097
    },
    {
      "recipient": "Mongolia",
      "region": "Asia",
      "commitment": 2505.8186,
      "disbursement": 1697.523,
      "commitment_defl": 2600.1278,
      "disbursement_defl": 1603.8973,
      "count": 1235,
      "lat": 47.240888,
      "lng": 105.664943
    },
    {
      "recipient": "Lao People's Democratic Republic",
      "region": "Asia",
      "commitment": 2469.5895,
      "disbursement": 1744.0109,
      "commitment_defl": 2853.3079,
      "disbursement_defl": 1753.5563,
      "count": 1724,
      "lat": 18.347074,
      "lng": 103.652776
    },
    {
      "recipient": "Tajikistan",
      "region": "Asia",
      "commitment": 1944.8451,
      "disbursement": 1291.0821,
      "commitment_defl": 2110.9683,
      "disbursement_defl": 1354.7492,
      "count": 837,
      "lat": 38.606684,
      "lng": 69.347569
    },
    {
      "recipient": "Armenia",
      "region": "Asia",
      "commitment": 1644.3439,
      "disbursement": 1128.0517,
      "commitment_defl": 1865.6931,
      "disbursement_defl": 1276.6214,
      "count": 721,
      "lat": 40.071525,
      "lng": 45.045449
    },
    {
      "recipient": "Kyrgyz Republic",
      "region": "Asia",
      "commitment": 1597.9624,
      "disbursement": 919.0539,
      "commitment_defl": 1700.2066,
      "disbursement_defl": 945.6038,
      "count": 1001,
      "lat": 41.639261,
      "lng": 74.565775
    },
    {
      "recipient": "Marshall Islands",
      "region": "Oceania",
      "commitment": 1112.8909,
      "disbursement": 911.7664,
      "commitment_defl": 1066.6454,
      "disbursement_defl": 871.7118,
      "count": 175,
      "lat": 7.277766,
      "lng": 170.847504
    },
    {
      "recipient": "Maldives",
      "region": "Asia",
      "commitment": 998.479,
      "disbursement": 524.3489,
      "commitment_defl": 1117.9382,
      "disbursement_defl": 557.5479,
      "count": 400,
      "lat": 6.626163,
      "lng": 73.067091
    },
    {
      "recipient": "Timor-Leste",
      "region": "Asia",
      "commitment": 956.2595,
      "disbursement": 627.3696,
      "commitment_defl": 976.4176,
      "disbursement_defl": 648.1632,
      "count": 703,
      "lat": -8.720134,
      "lng": 125.836836
    },
    {
      "recipient": "Turkmenistan",
      "region": "Asia",
      "commitment": 790.9849,
      "disbursement": 222.4423,
      "commitment_defl": 872.7242,
      "disbursement_defl": 238.9018,
      "count": 206,
      "lat": 39.076436,
      "lng": 55.60014
    },
    {
      "recipient": "Solomon Islands",
      "region": "Oceania",
      "commitment": 691.5603,
      "disbursement": 538.3058,
      "commitment_defl": 746.21,
      "disbursement_defl": 537.388,
      "count": 711,
      "lat": -9.134811,
      "lng": 159.857812
    },
    {
      "recipient": "Vanuatu",
      "region": "Oceania",
      "commitment": 635.6481,
      "disbursement": 469.8292,
      "commitment_defl": 718.3765,
      "disbursement_defl": 498.8292,
      "count": 634,
      "lat": -17.077427,
      "lng": 168.072256
    },
    {
      "recipient": "Fiji",
      "region": "Oceania",
      "commitment": 603.3762,
      "disbursement": 246.6802,
      "commitment_defl": 787.8462,
      "disbursement_defl": 268.5059,
      "count": 389,
      "lat": -17.839101,
      "lng": 178.086098
    },
    {
      "recipient": "Samoa",
      "region": "Oceania",
      "commitment": 537.7623,
      "disbursement": 309.2097,
      "commitment_defl": 648.851,
      "disbursement_defl": 307.7755,
      "count": 558,
      "lat": -13.834293,
      "lng": -171.860004
    },
    {
      "recipient": "Kiribati",
      "region": "Oceania",
      "commitment": 408.2272,
      "disbursement": 241.2051,
      "commitment_defl": 416.2483,
      "disbursement_defl": 235.627,
      "count": 308,
      "lat": 1.231141,
      "lng": 107.199773
    },
    {
      "recipient": "Tonga",
      "region": "Oceania",
      "commitment": 346.3494,
      "disbursement": 213.4658,
      "commitment_defl": 408.4582,
      "disbursement_defl": 231.2704,
      "count": 439,
      "lat": -20.006705,
      "lng": -174.765753
    },
    {
      "recipient": "Bhutan",
      "region": "Asia",
      "commitment": 326.1691,
      "disbursement": 301.4263,
      "commitment_defl": 337.6923,
      "disbursement_defl": 285.8289,
      "count": 552,
      "lat": 27.232189,
      "lng": 89.995252
    },
    {
      "recipient": "Tuvalu",
      "region": "Oceania",
      "commitment": 302.6808,
      "disbursement": 116.6411,
      "commitment_defl": 333.3139,
      "disbursement_defl": 117.9105,
      "count": 197,
      "lat": -7.975008,
      "lng": 178.482293
    },
    {
      "recipient": "Micronesia (Federated States of)",
      "region": "Oceania",
      "commitment": 264.7423,
      "disbursement": 106.3709,
      "commitment_defl": 252.0151,
      "disbursement_defl": 84.272,
      "count": 145,
      "lat": 7.330033,
      "lng": 152.077054
    },
    {
      "recipient": "Cook Islands",
      "region": "Oceania",
      "commitment": 31.8266,
      "disbursement": 29.8913,
      "commitment_defl": 39.9683,
      "disbursement_defl": 32.6989,
      "count": 96,
      "lat": -21.205982,
      "lng": -159.786433
    }
  ],
  "yearModeStack": [
    {
      "year": "1973",
      "Road": 1158.891,
      "Rail": 956.4547,
      "Aviation": 308.9893,
      "Water": 1089.4659,
      "Other": 6.5803
    },
    {
      "year": "1974",
      "Road": 710.569,
      "Rail": 505.5864,
      "Aviation": 43.6963,
      "Water": 712.8038,
      "Other": 98.2351
    },
    {
      "year": "1975",
      "Road": 200.1085,
      "Rail": 492.9034,
      "Aviation": 93.6212,
      "Water": 181.0436,
      "Other": 0.0
    },
    {
      "year": "1976",
      "Road": 286.6646,
      "Rail": 62.9614,
      "Aviation": 93.4793,
      "Water": 400.102,
      "Other": 110.2801
    },
    {
      "year": "1977",
      "Road": 878.26,
      "Rail": 173.5252,
      "Aviation": 45.0704,
      "Water": 385.0452,
      "Other": 49.976
    },
    {
      "year": "1978",
      "Road": 385.662,
      "Rail": 914.5098,
      "Aviation": 127.1365,
      "Water": 475.9725,
      "Other": 194.7571
    },
    {
      "year": "1979",
      "Road": 461.8251,
      "Rail": 373.3341,
      "Aviation": 98.0165,
      "Water": 1193.3053,
      "Other": 40.5705
    },
    {
      "year": "1980",
      "Road": 1470.7274,
      "Rail": 775.6282,
      "Aviation": 332.4476,
      "Water": 1277.5595,
      "Other": 13.498
    },
    {
      "year": "1981",
      "Road": 665.5876,
      "Rail": 247.2452,
      "Aviation": 93.1925,
      "Water": 1153.2399,
      "Other": 52.6442
    },
    {
      "year": "1982",
      "Road": 1677.5503,
      "Rail": 1921.0775,
      "Aviation": 152.1046,
      "Water": 1325.8953,
      "Other": 0.5699
    },
    {
      "year": "1983",
      "Road": 1090.1672,
      "Rail": 851.9866,
      "Aviation": 160.6186,
      "Water": 970.4623,
      "Other": 486.2671
    },
    {
      "year": "1984",
      "Road": 2816.2138,
      "Rail": 2046.2546,
      "Aviation": 151.6542,
      "Water": 1467.8627,
      "Other": 32.6484
    },
    {
      "year": "1985",
      "Road": 1553.9914,
      "Rail": 1520.2801,
      "Aviation": 213.5811,
      "Water": 778.6191,
      "Other": 44.8687
    },
    {
      "year": "1986",
      "Road": 1503.0348,
      "Rail": 1471.3155,
      "Aviation": 548.1541,
      "Water": 1141.3389,
      "Other": 88.0669
    },
    {
      "year": "1987",
      "Road": 3270.9204,
      "Rail": 1170.7667,
      "Aviation": 152.443,
      "Water": 952.1497,
      "Other": 165.4452
    },
    {
      "year": "1988",
      "Road": 2574.8387,
      "Rail": 1133.4313,
      "Aviation": 225.4934,
      "Water": 1063.953,
      "Other": 243.2672
    },
    {
      "year": "1989",
      "Road": 3104.2361,
      "Rail": 1690.5463,
      "Aviation": 126.3537,
      "Water": 1027.5772,
      "Other": 401.9882
    },
    {
      "year": "1990",
      "Road": 1598.9358,
      "Rail": 1079.9393,
      "Aviation": 56.854,
      "Water": 676.4517,
      "Other": 507.2171
    },
    {
      "year": "1991",
      "Road": 3056.2003,
      "Rail": 1247.1624,
      "Aviation": 299.4763,
      "Water": 1394.2636,
      "Other": 435.6962
    },
    {
      "year": "1992",
      "Road": 2846.8041,
      "Rail": 1033.2325,
      "Aviation": 82.7569,
      "Water": 734.6416,
      "Other": 177.2193
    },
    {
      "year": "1993",
      "Road": 2461.7757,
      "Rail": 2606.2615,
      "Aviation": 473.2651,
      "Water": 1073.4693,
      "Other": 180.8243
    },
    {
      "year": "1994",
      "Road": 4304.835,
      "Rail": 1194.8305,
      "Aviation": 533.2404,
      "Water": 649.1708,
      "Other": 568.2873
    },
    {
      "year": "1995",
      "Road": 2849.6837,
      "Rail": 1483.2675,
      "Aviation": 381.6643,
      "Water": 1496.0702,
      "Other": 378.1966
    },
    {
      "year": "1996",
      "Road": 2943.6487,
      "Rail": 1556.74,
      "Aviation": 907.9174,
      "Water": 1106.1776,
      "Other": 77.088
    },
    {
      "year": "1997",
      "Road": 2477.5634,
      "Rail": 2113.9138,
      "Aviation": 384.4362,
      "Water": 578.1019,
      "Other": 104.643
    },
    {
      "year": "1998",
      "Road": 3267.0433,
      "Rail": 1386.1925,
      "Aviation": 511.4507,
      "Water": 518.4129,
      "Other": 599.4648
    },
    {
      "year": "1999",
      "Road": 3393.654,
      "Rail": 1206.9491,
      "Aviation": 342.7991,
      "Water": 887.4428,
      "Other": 1970.3497
    },
    {
      "year": "2000",
      "Road": 4664.768,
      "Rail": 1108.0912,
      "Aviation": 430.813,
      "Water": 515.6946,
      "Other": 331.7207
    },
    {
      "year": "2001",
      "Road": 5595.86,
      "Rail": 1555.8452,
      "Aviation": 99.4919,
      "Water": 138.4521,
      "Other": 406.2556
    },
    {
      "year": "2002",
      "Road": 4658.5795,
      "Rail": 942.369,
      "Aviation": 628.2892,
      "Water": 432.0167,
      "Other": 37.4669
    },
    {
      "year": "2003",
      "Road": 4457.8539,
      "Rail": 725.9082,
      "Aviation": 63.42,
      "Water": 25.6896,
      "Other": 168.371
    },
    {
      "year": "2004",
      "Road": 6192.3222,
      "Rail": 2060.1678,
      "Aviation": 486.8732,
      "Water": 416.0341,
      "Other": 506.4083
    },
    {
      "year": "2005",
      "Road": 4989.2019,
      "Rail": 2468.1609,
      "Aviation": 290.3408,
      "Water": 370.3703,
      "Other": 341.4846
    },
    {
      "year": "2006",
      "Road": 5175.2636,
      "Rail": 1858.3792,
      "Aviation": 18.4827,
      "Water": 186.865,
      "Other": 3032.0006
    },
    {
      "year": "2007",
      "Road": 2839.4992,
      "Rail": 1521.3001,
      "Aviation": 50.7019,
      "Water": 524.3011,
      "Other": 2827.5486
    },
    {
      "year": "2008",
      "Road": 6784.7867,
      "Rail": 2914.322,
      "Aviation": 294.9099,
      "Water": 380.6473,
      "Other": 3058.331
    },
    {
      "year": "2009",
      "Road": 8501.9266,
      "Rail": 3044.2106,
      "Aviation": 245.0078,
      "Water": 364.415,
      "Other": 3401.3217
    },
    {
      "year": "2010",
      "Road": 6660.4445,
      "Rail": 3571.3684,
      "Aviation": 361.4203,
      "Water": 339.5598,
      "Other": 1065.0767
    },
    {
      "year": "2011",
      "Road": 10315.6876,
      "Rail": 2442.7121,
      "Aviation": 150.7757,
      "Water": 262.3279,
      "Other": 1155.8974
    },
    {
      "year": "2012",
      "Road": 6237.7158,
      "Rail": 2980.6475,
      "Aviation": 555.1082,
      "Water": 385.8569,
      "Other": 2818.9663
    },
    {
      "year": "2013",
      "Road": 8133.6007,
      "Rail": 4152.6458,
      "Aviation": 601.2894,
      "Water": 890.01,
      "Other": 3895.3981
    },
    {
      "year": "2014",
      "Road": 5882.2559,
      "Rail": 4987.6007,
      "Aviation": 446.9305,
      "Water": 425.991,
      "Other": 2529.402
    },
    {
      "year": "2015",
      "Road": 7523.2219,
      "Rail": 5202.0985,
      "Aviation": 774.7904,
      "Water": 196.5794,
      "Other": 2766.3342
    },
    {
      "year": "2016",
      "Road": 7414.5193,
      "Rail": 6116.5917,
      "Aviation": 774.8929,
      "Water": 1693.0785,
      "Other": 2801.0831
    },
    {
      "year": "2017",
      "Road": 8995.9205,
      "Rail": 3775.4107,
      "Aviation": 949.7326,
      "Water": 2211.6201,
      "Other": 2900.5911
    },
    {
      "year": "2018",
      "Road": 8722.4033,
      "Rail": 7651.1988,
      "Aviation": 167.2801,
      "Water": 619.8984,
      "Other": 3363.0386
    },
    {
      "year": "2019",
      "Road": 6871.0486,
      "Rail": 6502.227,
      "Aviation": 190.3057,
      "Water": 1028.7687,
      "Other": 3165.087
    },
    {
      "year": "2020",
      "Road": 7420.9093,
      "Rail": 5513.9195,
      "Aviation": 808.715,
      "Water": 647.5814,
      "Other": 3439.2876
    },
    {
      "year": "2021",
      "Road": 5109.9956,
      "Rail": 5738.1092,
      "Aviation": 598.4017,
      "Water": 355.8533,
      "Other": 1949.881
    },
    {
      "year": "2022",
      "Road": 4724.6513,
      "Rail": 8101.6675,
      "Aviation": 638.6344,
      "Water": 1327.6263,
      "Other": 2277.229
    },
    {
      "year": "2023",
      "Road": 7278.0218,
      "Rail": 11965.0613,
      "Aviation": 1595.2247,
      "Water": 1666.7352,
      "Other": 842.4017
    },
    {
      "year": "2024",
      "Road": 10061.573,
      "Rail": 7165.8173,
      "Aviation": 1580.9274,
      "Water": 1414.6977,
      "Other": 2385.5861
    }
  ],
  "topRecipients": [
    {
      "label": "India",
      "commitment": 103079.1704,
      "disbursement": 62480.2478,
      "commitment_defl": 109969.4002,
      "disbursement_defl": 61386.3938,
      "count": 6784
    },
    {
      "label": "People's Republic of China",
      "commitment": 57764.9348,
      "disbursement": 33333.6142,
      "commitment_defl": 72775.1841,
      "disbursement_defl": 38246.8304,
      "count": 10106
    },
    {
      "label": "Philippines",
      "commitment": 35938.7501,
      "disbursement": 14408.5773,
      "commitment_defl": 35513.5831,
      "disbursement_defl": 13068.045,
      "count": 5751
    },
    {
      "label": "Bangladesh",
      "commitment": 30174.7988,
      "disbursement": 13427.6974,
      "commitment_defl": 32294.6067,
      "disbursement_defl": 13244.2138,
      "count": 3935
    },
    {
      "label": "Indonesia",
      "commitment": 29180.1864,
      "disbursement": 14196.6379,
      "commitment_defl": 37484.0077,
      "disbursement_defl": 15536.2699,
      "count": 8041
    },
    {
      "label": "Viet Nam",
      "commitment": 26846.2812,
      "disbursement": 18963.6361,
      "commitment_defl": 25376.9526,
      "disbursement_defl": 17451.7599,
      "count": 6138
    },
    {
      "label": "Türkiye",
      "commitment": 23063.322,
      "disbursement": 14590.672,
      "commitment_defl": 26227.7032,
      "disbursement_defl": 15398.2001,
      "count": 1836
    },
    {
      "label": "Thailand",
      "commitment": 14463.2084,
      "disbursement": 8868.4086,
      "commitment_defl": 14511.6832,
      "disbursement_defl": 7019.5015,
      "count": 2081
    },
    {
      "label": "Kazakhstan",
      "commitment": 13478.2627,
      "disbursement": 7933.9013,
      "commitment_defl": 14788.7626,
      "disbursement_defl": 8505.4201,
      "count": 898
    },
    {
      "label": "Pakistan",
      "commitment": 12976.914,
      "disbursement": 5824.5189,
      "commitment_defl": 15889.2063,
      "disbursement_defl": 6188.8293,
      "count": 2781
    }
  ],
  "topDonors": [
    {
      "label": "Japan",
      "commitment": 145214.7979,
      "disbursement": 88824.7713,
      "commitment_defl": 120176.2663,
      "disbursement_defl": 70209.5215,
      "count": 25650
    },
    {
      "label": "Asian Development Bank",
      "commitment": 96239.7061,
      "disbursement": 47089.8525,
      "commitment_defl": 117008.6634,
      "disbursement_defl": 51592.4009,
      "count": 12083
    },
    {
      "label": "International Bank for Reconstruction and Development",
      "commitment": 56942.5998,
      "disbursement": 33060.9899,
      "commitment_defl": 80494.4774,
      "disbursement_defl": 39136.0475,
      "count": 6694
    },
    {
      "label": "International Development Association",
      "commitment": 19857.0257,
      "disbursement": 10249.3056,
      "commitment_defl": 27244.4516,
      "disbursement_defl": 12042.2717,
      "count": 8222
    },
    {
      "label": "Republic of Korea",
      "commitment": 19804.1209,
      "disbursement": 12531.2064,
      "commitment_defl": 19513.4036,
      "disbursement_defl": 12138.7678,
      "count": 2558
    },
    {
      "label": "Germany",
      "commitment": 13344.4389,
      "disbursement": 9830.5828,
      "commitment_defl": 20096.4966,
      "disbursement_defl": 15352.0607,
      "count": 4463
    },
    {
      "label": "European Union Institutions",
      "commitment": 12377.9818,
      "disbursement": 10123.1245,
      "commitment_defl": 13904.0246,
      "disbursement_defl": 11188.9834,
      "count": 1093
    },
    {
      "label": "Asian Infrastructure Investment Bank",
      "commitment": 11260.6681,
      "disbursement": 3906.6872,
      "commitment_defl": 11893.778,
      "disbursement_defl": 4034.2716,
      "count": 161
    },
    {
      "label": "European Bank for Reconstruction and Development",
      "commitment": 7727.9133,
      "disbursement": 5489.7589,
      "commitment_defl": 8376.3984,
      "disbursement_defl": 5959.8332,
      "count": 621
    },
    {
      "label": "United States",
      "commitment": 6625.1678,
      "disbursement": 4438.0595,
      "commitment_defl": 9732.8917,
      "disbursement_defl": 6202.1612,
      "count": 2441
    }
  ],
  "modeSeries": [
    {
      "label": "Road",
      "commitment": 189337.6811,
      "disbursement": 107675.3975,
      "commitment_defl": 218221.4226,
      "disbursement_defl": 112250.0101,
      "count": 33564
    },
    {
      "label": "Rail",
      "commitment": 131907.125,
      "disbursement": 77238.3742,
      "commitment_defl": 135282.1263,
      "disbursement_defl": 73337.5108,
      "count": 12199
    },
    {
      "label": "Other",
      "commitment": 50718.6078,
      "disbursement": 29434.7754,
      "commitment_defl": 58494.8182,
      "disbursement_defl": 32183.5019,
      "count": 14646
    },
    {
      "label": "Water",
      "commitment": 31114.7721,
      "disbursement": 14477.5483,
      "commitment_defl": 41531.2687,
      "disbursement_defl": 16903.262,
      "count": 9677
    },
    {
      "label": "Aviation",
      "commitment": 19859.4251,
      "disbursement": 11655.3256,
      "commitment_defl": 19742.6721,
      "disbursement_defl": 10460.027,
      "count": 7485
    }
  ],
  "sectorSeries": [
    {
      "label": "Environment",
      "commitment": 126825.7468,
      "disbursement": 72469.2139,
      "commitment_defl": 116241.5752,
      "disbursement_defl": 66294.4272,
      "count": 16064
    },
    {
      "label": "Gender",
      "commitment": 95656.8484,
      "disbursement": 48825.9228,
      "commitment_defl": 92546.8805,
      "disbursement_defl": 47882.6338,
      "count": 8486
    },
    {
      "label": "Mitigation",
      "commitment": 75899.7819,
      "disbursement": 37124.9606,
      "commitment_defl": 66249.5034,
      "disbursement_defl": 32656.5524,
      "count": 3247
    },
    {
      "label": "Adaptation",
      "commitment": 14986.8103,
      "disbursement": 5568.6515,
      "commitment_defl": 13357.9873,
      "disbursement_defl": 5165.4955,
      "count": 1708
    },
    {
      "label": "DRR",
      "commitment": 5353.5146,
      "disbursement": 267.3906,
      "commitment_defl": 5273.0045,
      "disbursement_defl": 268.0097,
      "count": 607
    },
    {
      "label": "Biodiversity",
      "commitment": 989.6239,
      "disbursement": 1010.2357,
      "commitment_defl": 1115.0158,
      "disbursement_defl": 1144.4788,
      "count": 719
    }
  ],
  "donorModeStack": [
    {
      "label": "Japan",
      "commitment": 145214.7979,
      "disbursement": 88824.7713,
      "Road": 34369.065,
      "Rail": 63725.5604,
      "Aviation": 9196.7081,
      "Water": 11644.9074,
      "Other": 1240.0253
    },
    {
      "label": "Asian Development Bank",
      "commitment": 96239.7061,
      "disbursement": 47089.8525,
      "Road": 76235.6309,
      "Rail": 19008.9492,
      "Aviation": 2129.9691,
      "Water": 5538.3255,
      "Other": 14095.7887
    },
    {
      "label": "International Bank for Reconstruction and Development",
      "commitment": 56942.5998,
      "disbursement": 33060.9899,
      "Road": 48700.7783,
      "Rail": 17598.7964,
      "Aviation": 142.1987,
      "Water": 6693.0273,
      "Other": 7359.6767
    },
    {
      "label": "International Development Association",
      "commitment": 19857.0257,
      "disbursement": 10249.3056,
      "Road": 17524.8829,
      "Rail": 2870.5733,
      "Aviation": 491.1634,
      "Water": 2944.6962,
      "Other": 3413.1358
    },
    {
      "label": "Republic of Korea",
      "commitment": 19804.1209,
      "disbursement": 12531.2064,
      "Road": 8695.0979,
      "Rail": 1909.905,
      "Aviation": 580.1777,
      "Water": 838.8749,
      "Other": 7489.3481
    },
    {
      "label": "Germany",
      "commitment": 13344.4389,
      "disbursement": 9830.5828,
      "Road": 2327.0964,
      "Rail": 7677.1996,
      "Aviation": 246.9041,
      "Water": 7743.0987,
      "Other": 2102.1978
    },
    {
      "label": "European Union Institutions",
      "commitment": 12377.9818,
      "disbursement": 10123.1245,
      "Road": 1841.6636,
      "Rail": 5717.774,
      "Aviation": 140.6379,
      "Water": 481.0141,
      "Other": 5722.935
    },
    {
      "label": "Asian Infrastructure Investment Bank",
      "commitment": 11260.6681,
      "disbursement": 3906.6872,
      "Road": 5689.1731,
      "Rail": 3874.9104,
      "Aviation": 1569.6831,
      "Water": 71.6711,
      "Other": 688.3403
    }
  ],
  "financingSeries": [
    {
      "label": "ODA Loans",
      "commitment": 206783.1991,
      "disbursement": 122918.5564,
      "commitment_defl": 205505.1081,
      "disbursement_defl": 115218.9701,
      "count": 39130
    },
    {
      "label": "Other Official Flows (non Export Credit)",
      "commitment": 183762.862,
      "disbursement": 95434.7459,
      "commitment_defl": 227186.2226,
      "disbursement_defl": 105803.8176,
      "count": 13466
    },
    {
      "label": "ODA Grants",
      "commitment": 31899.402,
      "disbursement": 21833.7846,
      "commitment_defl": 40037.9263,
      "disbursement_defl": 23785.6656,
      "count": 24749
    },
    {
      "label": "Equity Investment",
      "commitment": 310.5799,
      "disbursement": 158.3268,
      "commitment_defl": 350.4387,
      "disbursement_defl": 178.8999,
      "count": 60
    },
    {
      "label": "Private Sector Instruments (PSI)",
      "commitment": 120.4082,
      "disbursement": 76.8512,
      "commitment_defl": 120.4832,
      "disbursement_defl": 77.4263,
      "count": 30
    },
    {
      "label": "Private Development Finance",
      "commitment": 61.1599,
      "disbursement": 59.1561,
      "commitment_defl": 72.129,
      "disbursement_defl": 69.5323,
      "count": 136
    }
  ]
};

export const crsFmt = {
  usdM: (v: number): string => {
    if (!Number.isFinite(v)) return '—';
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
    return `$${v.toFixed(1)}M`;
  },
  num: (n: number): string => n.toLocaleString(),
};
