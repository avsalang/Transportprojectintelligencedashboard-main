const OVERVIEW_PARAGRAPHS = [
  'This dashboard provides a searchable overview of transport projects across countries, financing sources, transport modes, and policy themes. It is designed to help users explore where transport investments are taking place, what types of projects are being supported, and how these projects relate to wider development priorities such as connectivity, safety, climate resilience, urban mobility, and low-carbon transport.',
  'The dashboard brings project information into one place and allows users to move from a broad selection view to more detailed project-level information. Users can filter projects by country, region, year, project status, financing source, sector, and theme. The aim is to make transport project data easier to understand, compare, and use for planning, research, policy analysis, and investment dialogue.',
  'This tool is intended as a practical starting point for exploring transport investment patterns. It does not replace official project documents or financing databases. Users are encouraged to refer to the original source links for full project details, legal information, and the most recent project status.',
];

const SCOPE_PARAGRAPHS = [
  'The dashboard is based on information available in the OECD Creditor Reporting System (CRS) and other publicly available project-level fields used in the analysis.',
  'The dashboard uses data from the OECD Creditor Reporting System (CRS), which provides project-level information on official development finance reported by bilateral and multilateral providers. Its scope is limited to reported transport-related development finance flows captured in the selected dataset, countries, years, providers, and purpose codes. It does not represent a complete inventory of all transport investments, all low-carbon transport projects, or all climate finance for transport in Asia and the Pacific.',
  'The CRS is used here to identify transport-related development finance flows, including commitments and disbursements by year, recipient, provider, finance type, and purpose code. The dashboard presents this information in an aggregated and interpreted form to support selection analysis and policy discussion. It should not be treated as a substitute for the official OECD CRS database or for individual project documents.',
  'While the CRS provides a useful basis for tracking transport-related development finance, it was not designed specifically as a sustainable or low-carbon transport project database. Some project records therefore contain limited detail on project scope, components, technologies, expected outcomes, implementation status, or climate-related objectives.',
  'Additional tags used in the dashboard, such as transport mode, e-mobility relevance, road safety relevance, or other thematic classifications, are derived from available project titles, descriptions, purpose codes, and other reported fields. Where project descriptions are brief or generic, the tags should be treated as indicative rather than definitive. In cases where specific information is not available in the project record or related public sources, the dashboard does not attempt to infer or collect additional data beyond what can be reasonably verified. The geographical groupings have also been revised to reflect the regional groupings of the ADB.',
  'Users should also note that commitments and disbursements reflect reported development finance flows and may not fully represent total project costs, domestic co-financing, private sector participation, or later changes in project design. A commitment refers to a firm written obligation made in a reporting year, while a disbursement refers to funds actually released during a reporting year. These values should therefore be interpreted carefully, especially when comparing across years, providers, or countries.',
  'The dashboard may also be affected by differences in reporting practices across providers, changes in purpose-code classifications over time, and variations in the level of detail included in project descriptions. Some projects may support transport indirectly or may include transport as part of a broader multisector program. Conversely, some relevant transport activities may not be fully visible if they are reported under broader infrastructure, urban development, climate, or policy-support categories.',
  'For these reasons, the dashboard should be used as an analytical and exploratory tool rather than a complete or official inventory of all transport investments. Users are encouraged to consult the original OECD CRS records, provider databases, and project documents for official classifications, financing details, project scope, and project-specific information.',
  'Aside from the OECD data, it also integrates other information such as the climate finance readiness screener, including selected indicators linked to the Data-to-Deal Approach, to help users better understand not only where low-carbon transport finance is flowing, but also where countries may need support to prepare, coordinate, and finance investment-ready transport decarbonization actions.',
];

const DISCLAIMER_PARAGRAPHS = [
  'This dashboard is intended for research, analysis, and knowledge-sharing purposes. It uses publicly available OECD Creditor Reporting System (CRS) data and presents the information in an aggregated and interpreted form. While efforts have been made to ensure consistency and accuracy, the dashboard should not be treated as an official OECD, ADB, FCDO, CCG, or ATO database, nor as a substitute for original project documents, official statistical releases, or provider-reported records. Any errors or interpretations are the responsibility of the dashboard authors. Users should refer to the original OECD CRS data and relevant project documents for official definitions, classifications, financing details, and project status.',
];

const ACKNOWLEDGEMENTS_PARAGRAPHS = [
  'This tool was developed with support from ADB\'s TA-6763 REG: Accelerating Innovation in Transport, under the Pathways for Decarbonization of the Transport Sector project. The project is funded by the Foreign, Commonwealth & Development Office (FCDO) and implemented by ADB in coordination with the Climate Compatible Growth (CCG) programme. The tool also builds on and complements the work of the Asian Transport Observatory (ATO) by helping organize and visualize transport investment data across Asia and the Pacific.',
];

function Section({ title, children }: { title: string; children: string[] }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <div className="space-y-4 text-[15px] leading-7 text-slate-600">
        {children.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

export function About() {
  return (
    <div className="bg-slate-50/50 px-6 py-8">
      <div className="mx-auto max-w-[1040px] space-y-8">
        <div>
          <p className="text-sm font-semibold text-sky-700">About</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Asia and the Pacific Transport Development Finance Explorer</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            Search, compare, and interpret transport-related development finance across Asia and the Pacific.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-7 shadow-sm">
          <div className="space-y-8">
            <Section title="Overview" children={OVERVIEW_PARAGRAPHS} />
            <Section title="Scope and Limitations" children={SCOPE_PARAGRAPHS} />
            <Section title="Disclaimer" children={DISCLAIMER_PARAGRAPHS} />
            <Section title="Acknowledgements" children={ACKNOWLEDGEMENTS_PARAGRAPHS} />

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900">Sources</h2>
              <div className="space-y-4 text-[15px] leading-7 text-slate-600">
                <p>
                  OECD. 2026. "OECD Data Explorer - CRS: Creditor Reporting System (Flows)." April 8.{' '}
                  <a
                    href="https://data-explorer.oecd.org/vis?lc=en&df[ds]=DcdDisseminateFinalDMZ&df[id]=DSD_CRS%40DF_CRS&df[ag]=OECD.DCD.FSD&dq=ALLD.MNG.21020.100._T._T.D.Q._T..&to[TIME_PERIOD]=false&pd=2002%2C2024&vw=ov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sky-700 underline decoration-sky-300 underline-offset-4 hover:text-sky-900"
                  >
                    OECD CRS data source
                  </a>
                  .
                </p>
                <p>
                  OECD content published from 1 July 2024 is generally made available under the Creative Commons Attribution 4.0 International license (CC BY 4.0), unless otherwise stated. Users should refer to the OECD Terms and Conditions and the original CRS data source for official definitions, metadata, and licensing conditions.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
