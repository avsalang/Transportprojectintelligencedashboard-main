import React from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import { crsFmt } from '../data/crsData';

interface SankeyProps {
  data: {
    nodes: any[];
    links: any[];
  };
}

export function CRSSankey({ data }: SankeyProps) {
  if (!data || !data.nodes || data.nodes.length === 0 || !data.links || data.links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
            <div className="w-6 h-6 border-2 border-slate-100 border-t-blue-400 rounded-full animate-spin" />
        </div>
        <div className="text-center">
           <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">No Flow Pathways Detected</p>
           <p className="text-[10px] font-medium text-slate-400 mt-1">Adjust filters to visualize donor-recipient connectivity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveSankey
        data={data}
        margin={{ top: 20, right: 220, bottom: 20, left: 220 }}
        align="justify"
        colors={{ scheme: 'category10' }}
        nodeOpacity={0.8}
        nodeHoverOpacity={1}
        nodeThickness={14}
        nodeInnerPadding={3}
        nodeSpacing={24}
        nodeBorderWidth={0}
        nodeBorderRadius={3}
        linkOpacity={0.25}
        linkHoverOpacity={0.5}
        linkContract={0}
        enableLinkGradient={true}
        label="name"
        labelPosition="outside"
        labelPadding={20}
        labelOrientation="horizontal"
        labelTextColor={{
          from: 'color',
          modifiers: [['darker', 1.6]],
        }}
        nodeTooltip={({ node }) => (
          <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-xl text-xs min-w-[180px]">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-50 pb-2">
               <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: node.color }} />
               <span className="font-semibold text-slate-900 uppercase tracking-tight">{node.name}</span>
            </div>
            <div className="space-y-2">
               <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Global Portfolio</span>
                  <span className="text-blue-600 font-semibold">{crsFmt.usdM(node.globalValue || 0)}</span>
               </div>
               <div className="flex justify-between items-center px-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Visible Flows</span>
                  <span className="text-slate-900 font-semibold">{node.formattedValue}</span>
               </div>
            </div>
          </div>
        )}
        valueFormat={(v) => crsFmt.usdM(v)}
        theme={{
          labels: {
            text: {
              fontSize: 10,
              fontWeight: 600,
              fill: '#475569',
            },
          },
          tooltip: {
            container: {
              background: '#ffffff',
              color: '#1e293b',
              fontSize: 12,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0',
              padding: '8px 12px',
            },
          },
        }}
      />
    </div>
  );
}
