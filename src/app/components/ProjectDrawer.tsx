import { ReactNode } from 'react';
import { X, MapPin, Calendar, DollarSign, Building2, FileText, ExternalLink, Navigation, AlertCircle } from 'lucide-react';
import { Project, fmt } from '../data/mockData';
import { SourceBadge } from './SourceBadge';
import { StatusBadge } from './StatusBadge';
import { ModePill } from './ModePill';

interface ProjectDrawerProps {
  project: Project | null;
  onClose: () => void;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-400 text-xs uppercase tracking-wide w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-slate-800 text-sm flex-1">{value || <span className="text-slate-400 italic">Unknown</span>}</span>
    </div>
  );
}

export function ProjectDrawer({ project, onClose }: ProjectDrawerProps) {
  if (!project) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[520px] max-w-full bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#0D1B2A] px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <SourceBadge source={project.funding_source} />
                <StatusBadge status={project.project_status} />
                {project.low_precision && (
                  <span className="flex items-center gap-1 text-amber-400 text-[10px] bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5">
                    <AlertCircle size={10} />
                    Low precision
                  </span>
                )}
              </div>
              <h2 className="text-white text-base font-semibold leading-snug">{project.project_name}</h2>
              <p className="text-slate-400 text-xs mt-1 font-mono">{project.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors flex-shrink-0 mt-0.5"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-px bg-slate-100 border-b border-slate-200">
            <MetricCell icon={<DollarSign size={14} />} label="Amount" value={fmt.usd(project.amount)} />
            <MetricCell icon={<Calendar size={14} />} label="Approval" value={project.approval_year ? String(project.approval_year) : '—'} />
            <MetricCell icon={<MapPin size={14} />} label="Country" value={project.country} />
            <MetricCell icon={<Building2 size={14} />} label="Financing" value={project.financing_type || '—'} />
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Classification */}
            <section>
              <h3 className="text-slate-500 text-[11px] uppercase tracking-wider font-medium mb-3">Classification</h3>
              <div className="space-y-2.5">
                <Row label="Region" value={project.region} />
                <Row label="Sector" value={project.sector} />
                <Row label="Subsector" value={project.subsector} />
                <Row
                  label="ATO Mode"
                  value={<ModePill mode={project.mode_ato_umbrella || project.transport_mode_category} />}
                />
                <Row label="ATO Detail" value={project.mode_ato_detail || project.transport_mode_detail} />
                {project.transport_mode !== (project.mode_ato_umbrella || project.transport_mode_category) && (
                  <Row label="Raw Mode" value={project.transport_mode} />
                )}
                <Row label="Function" value={project.transport_function} />
                <Row label="Context" value={project.transport_context} />
                <Row label="Infrastructure" value={project.infrastructure_type} />
              </div>
            </section>

            {/* Description */}
            {project.description && (
              <section>
                <h3 className="text-slate-500 text-[11px] uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
                  <FileText size={12} />
                  Project Description
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {project.description}
                </p>
              </section>
            )}

            {/* Location */}
            <section>
              <h3 className="text-slate-500 text-[11px] uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
                <Navigation size={12} />
                Location
              </h3>
              <div className="space-y-2.5">
                <Row label="Location" value={project.location_name || 'Not geocoded'} />
                <Row
                  label="Coordinates"
                  value={
                    project.has_coordinates && project.latitude && project.longitude
                      ? `${project.latitude.toFixed(4)}, ${project.longitude.toFixed(4)}`
                      : null
                  }
                />
                <Row label="Geo Status" value={
                  <span className={`text-xs font-medium ${
                    project.geo_status === 'matched' ? 'text-emerald-600' :
                    project.geo_status === 'already_geocoded' ? 'text-blue-600' :
                    project.geo_status === 'hold' ? 'text-amber-600' :
                    'text-slate-500'
                  }`}>
                    {project.geo_status}
                  </span>
                } />
                {project.low_precision && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                    <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-700 text-xs">
                      This location has low geocoding precision. The coordinates may represent a broad administrative area rather than a specific project site.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Source provenance */}
            <section>
              <h3 className="text-slate-500 text-[11px] uppercase tracking-wider font-medium mb-3 flex items-center gap-1.5">
                <ExternalLink size={12} />
                Source Provenance
              </h3>
              <div className="bg-slate-900 rounded-lg p-3">
                <p className="text-slate-300 text-[11px] font-mono leading-relaxed break-all">
                  {project.source_locator}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

function MetricCell({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wide mb-1">
        {icon}
        {label}
      </div>
      <p className="text-slate-900 text-sm font-semibold truncate">{value}</p>
    </div>
  );
}
