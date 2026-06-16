import { Loader, X } from 'lucide-react';

function FilterDropdown({ label, value, onChange, options, loading, placeholder }) {
  return (
    <div className="filter-wrap">
      <span className="filter-label">{label}</span>
      <div className="filter-select-wrap">
        <select
          className="filter-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={loading}
        >
          <option value="">{loading ? 'Loading…' : placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        {loading && <Loader size={12} className="filter-spinner" />}
        {!loading && value && (
          <button className="filter-clear" onClick={() => onChange('')} title={`Clear ${label}`}>
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function CompanyFilter({
  tenantId, onTenantChange, tenants, loadingTenants,
  companyName, onCompanyChange, companies, loadingCompanies,
}) {
  return (
    <div className="company-filter-row">
      <FilterDropdown
        label="Tenant"
        value={tenantId}
        onChange={(v) => { onTenantChange(v); onCompanyChange(''); }}
        options={tenants}
        loading={loadingTenants}
        placeholder="All tenants"
      />
      <FilterDropdown
        label="Company"
        value={companyName}
        onChange={onCompanyChange}
        options={companies}
        loading={loadingCompanies}
        placeholder="All companies"
      />
    </div>
  );
}
