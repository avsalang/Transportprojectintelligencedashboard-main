Design a professional web dashboard for a transport project intelligence database covering ADB, AIIB, and World Bank projects.

Goal:
Create a clean, modern, executive-friendly dashboard that showcases what the data can do: locations, amounts, recipients, dates, sectors, and project profiles. This is not a data engineering or QA dashboard. It should feel like a transport finance intelligence explorer.

Tone:
Professional, analytical, map-forward, portfolio/profile oriented. Avoid generic startup SaaS visuals. Use strong information hierarchy, restrained color, clear typography, and a polished institutional feel.

Primary user tasks:
1. Understand the overall transport project portfolio
2. Compare ADB, AIIB, and World Bank
3. Explore recipient countries and regions
4. See project distribution over time
5. Filter by transport mode, sector, geography, and status
6. Open a project detail view with traceability back to the source record

Dataset:
Main file:
transport_projects_cross_mdb_shareable_v3.csv

Row count:
6,372 transport projects

Sources:
- World Bank: 4,617
- ADB: 1,657
- AIIB: 98

Key fields available:
- funding_source
- project_id
- project_name
- country
- country_original
- country_standardized
- country_standardization_status
- region
- project_status
- approval_year
- approval_date
- sector_standardized
- subsector_standardized
- transport_mode_standardized
- transport_function
- transport_context
- infrastructure_type
- financing_type
- amount_original
- currency
- description
- final_geo_status
- final_location_for_geocoding
- final_location_name
- final_latitude
- final_longitude
- has_final_coordinates
- final_location_source
- geo_resolution_pass
- geo_low_precision_flag
- geo_monitor_status
- geo_followup_needed
- source_record_uid
- source_row_number
- source_file
- source_sheet
- source_locator

Important data facts:
- mapped projects with coordinates: 2,018
- geo statuses:
  - hold: 4,313
  - already_geocoded: 1,408
  - matched: 609
  - low_precision: 40
  - review: 1
  - zero_results: 1
- amount_original is mostly usable:
  - almost all rows are USD
  - small number are EUR
- strongest dimensions for filtering:
  - funding_source
  - country
  - region
  - project_status
  - approval_year
  - sector_standardized
  - subsector_standardized
  - transport_mode_standardized
  - transport_function
  - financing_type
  - geo_monitor_status

Design a dashboard with these pages or tabs:

1. Overview
Purpose:
Show the size, shape, and composition of the portfolio

Include:
- KPI cards:
  - Total projects
  - Total financing amount
  - Countries/economies covered
  - Mapped projects
- Large map panel with project points/clusters
- Projects by approval year chart
- Projects by MDB chart
- Projects by transport mode chart
- Top recipient countries chart
- Financing by MDB or by transport mode chart

2. Geography
Purpose:
Show where transport projects are concentrated

Include:
- world map or regional map
- country ranking table
- country comparison cards
- filters for source, year, status, mode
- on selecting a country:
  - project count
  - total financing
  - top modes
  - status mix
  - time trend
  - top projects

3. MDB Comparison
Purpose:
Compare ADB, AIIB, and World Bank

Include:
- project count by source
- financing by source
- mapped coverage by source
- mode mix by source
- top countries by source
- approval trend by source

4. Project Explorer
Purpose:
Enable filtering and drill-down

Include:
- searchable data table
- filter chips or sidebar filters
- row click opens project detail drawer/modal

5. Project Detail View
Purpose:
Present a project profile

Include:
- project title
- MDB/source
- project ID
- country
- region
- project status
- approval date/year
- amount and currency
- sector / subsector / mode
- transport function / context
- description
- location name
- coordinates if available
- source provenance block:
  - source_file
  - source_sheet
  - source_row_number
  - source_locator

Visual recommendations:
- Use a map as a major hero element
- Use clustered dots for projects
- Use horizontal bar charts for top countries and sectors
- Use stacked bars for project status and source comparisons
- Use time-series bars or area charts for approval trends
- Use a clean, dense but readable table in explorer view
- Use a side drawer rather than a full page for quick project details

Filtering behavior:
Global filters should affect all charts on the page.
Recommended global filters:
- funding_source
- country
- region
- approval_year range
- project_status
- sector_standardized
- transport_mode_standardized
- financing_type
- has_final_coordinates
- geo_monitor_status

Important UX rules:
- Render blanks as “Unknown”
- Visually mark low-precision mapped rows
- Allow “Mapped only” toggle for map pages
- Keep hold/unmapped projects visible in tables and counts, but not on the point map
- Country placeholders or non-economy aggregates should not dominate country visuals

Country handling:
Use standardized country values where available.
Use:
- country_standardized when country_standardization_status is exact or alias
Retain original labels in detail view.

Dashboard tone:
This should feel like a serious, polished transport portfolio intelligence tool, not a QA dashboard and not a developer tool.

Produce:
- overall layout
- desktop-first dashboard design
- mobile-aware responsive behavior
- component set for KPI cards, map panel, chart panel, filter sidebar, data table, and detail drawer
- a coherent visual system suitable for a quick Streamlit or web app implementation
