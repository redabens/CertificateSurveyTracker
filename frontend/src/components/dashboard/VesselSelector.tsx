'use client';

import React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Vessel {
  id: number;
  name: string;
  /** Computed status string from backend: 'Imminent' | 'Attention' | 'Suivi' | '' */
  status?: string;
}

export interface VesselSelectorProps {
  vessels: Vessel[];
  selectedVesselId: number | null;
  onSelect: (id: number) => void;
  /** If true, shows the "Add Vessel" button */
  isAdmin: boolean;
  onAddVessel: () => void;
  t: (key: string) => string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusDotClass(status?: string): string {
  if (status === 'Imminent') return 'red';
  if (status === 'Attention') return 'yellow';
  if (status === 'Suivi') return 'green';
  return 'normal';
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VesselSelector({
  vessels,
  selectedVesselId,
  onSelect,
  isAdmin,
  onAddVessel,
  t,
}: VesselSelectorProps) {
  return (
    <div className="fleet-sidebar">
      <div className="fleet-sidebar-header">
        <h3>{t('nav_fleet')}</h3>
        {isAdmin && (
          <button className="btn btn-sm btn-outline" onClick={onAddVessel}>
            {t('btn_manual_vessel')}
          </button>
        )}
      </div>

      <div className="fleet-list">
        {vessels.map((v) => (
          <div
            key={v.id}
            className={`fleet-vessel-item ${selectedVesselId === v.id ? 'active' : ''}`}
            onClick={() => onSelect(v.id)}
          >
            <span>{v.name}</span>
            <span className={`tv-indicator-circle ${getStatusDotClass(v.status)}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
