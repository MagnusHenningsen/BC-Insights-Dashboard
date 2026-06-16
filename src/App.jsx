import { useState, useEffect, useRef } from 'react';
import { Settings, Plus, RefreshCw, RotateCcw } from 'lucide-react';
import { useSettings } from './hooks/useSettings';
import { useDashboard } from './hooks/useDashboard';
import { useCompanies } from './hooks/useCompanies';
import { TIME_RANGES } from './queries/presets';
import DashboardBox from './components/DashboardBox';
import AddBoxModal from './components/AddBoxModal';
import SettingsPanel from './components/SettingsPanel';
import BoxList from './components/BoxList';
import CompanyFilter from './components/CompanyFilter';
import './App.css';

export default function App() {
  const [settings, setSettings] = useSettings();
  const { boxes, addBox, removeBox, toggleBox, updateBox, reorderBoxes, resetToDefault } = useDashboard();
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [timeRange, setTimeRange] = useState(settings.timeRange || '24h');
  const [tenantId, setTenantId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const timerRef = useRef(null);

  const connections = settings.connections || [];
  const activeConn = connections.find((c) => c.id === settings.activeConnectionId) || connections[0] || null;
  const activeSettings = { ...settings, appId: activeConn?.appId || '', apiKey: activeConn?.apiKey || '' };
  const hasCredentials = !!(activeSettings.appId && activeSettings.apiKey);

  const { tenants, companies, loadingTenants, loadingCompanies } = useCompanies(activeSettings, tenantId);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (settings.refreshInterval > 0) {
      timerRef.current = setInterval(() => setRefreshKey((k) => k + 1), settings.refreshInterval * 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [settings.refreshInterval]);

  const handleSwitchConnection = (connId) => {
    setSettings({ activeConnectionId: connId });
    setTenantId('');
    setCompanyName('');
  };

  const handleReset = () => {
    if (confirm('Reset dashboard to default layout? This will remove all custom boxes.')) {
      resetToDefault();
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="topbar-title">BC Telemetry Dashboard</span>
          <select
            className="time-select"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            {TIME_RANGES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {connections.length > 1 && (
            <div className="conn-tabs">
              {connections.map((conn) => (
                <button
                  key={conn.id}
                  className={`conn-tab${conn.id === activeConn?.id ? ' active' : ''}`}
                  onClick={() => handleSwitchConnection(conn.id)}
                  title={conn.appId}
                >
                  {conn.name}
                </button>
              ))}
            </div>
          )}

          <CompanyFilter
            tenantId={tenantId}
            onTenantChange={setTenantId}
            tenants={tenants}
            loadingTenants={loadingTenants}
            companyName={companyName}
            onCompanyChange={setCompanyName}
            companies={companies}
            loadingCompanies={loadingCompanies}
          />
        </div>
        <div className="topbar-right">
          {!hasCredentials && (
            <span className="cred-warning">No credentials — open Settings</span>
          )}
          <button className="btn-outline" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw size={14} /> Refresh all
          </button>
          <button className="btn-outline" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add box
          </button>
          <button className="icon-btn" onClick={handleReset} title="Reset to default layout">
            <RotateCcw size={17} />
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <div className="layout">
        <BoxList boxes={boxes} onToggle={toggleBox} onAdd={() => setShowAdd(true)} onReorder={reorderBoxes} />

        <main className="grid">
          {boxes.length === 0 && (
            <div className="empty-dashboard">
              <p>No boxes yet.</p>
              <button className="btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={15} /> Add your first box
              </button>
            </div>
          )}
          {boxes.filter((box) => box.visible).map((box) => (
            <DashboardBox
              key={box.id}
              box={box}
              settings={activeSettings}
              timeRange={timeRange}
              tenantId={tenantId}
              companyName={companyName}
              refreshKey={refreshKey}
              onRemove={() => removeBox(box.id)}
              onToggle={() => toggleBox(box.id)}
              onUpdateChartType={(t) => updateBox(box.id, { chartType: t })}
            />
          ))}
        </main>
      </div>

      {showAdd && <AddBoxModal onAdd={addBox} onClose={() => setShowAdd(false)} />}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={(s) => { setSettings(s); setTimeRange(s.timeRange); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
