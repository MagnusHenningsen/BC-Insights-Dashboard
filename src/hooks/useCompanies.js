import { useState, useEffect } from 'react';
import { runKql } from '../lib/appInsights';
import { TENANT_LIST_KQL, COMPANY_LIST_KQL } from '../queries/presets';

export function useCompanies(settings, tenantId) {
  const [tenants, setTenants] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Fetch tenant list once credentials are available
  useEffect(() => {
    if (!settings.appId || !settings.apiKey) return;
    setLoadingTenants(true);
    runKql({ appId: settings.appId, apiKey: settings.apiKey, query: TENANT_LIST_KQL })
      .then((rows) => setTenants(rows.map((r) => r.tenant).filter(Boolean)))
      .catch(() => setTenants([]))
      .finally(() => setLoadingTenants(false));
  }, [settings.appId, settings.apiKey]);

  // Fetch company list whenever tenant changes
  useEffect(() => {
    if (!settings.appId || !settings.apiKey) return;
    setLoadingCompanies(true);
    setCompanies([]);
    runKql({ appId: settings.appId, apiKey: settings.apiKey, query: COMPANY_LIST_KQL(tenantId) })
      .then((rows) => setCompanies(rows.map((r) => r.company).filter(Boolean)))
      .catch(() => setCompanies([]))
      .finally(() => setLoadingCompanies(false));
  }, [settings.appId, settings.apiKey, tenantId]);

  return { tenants, companies, loadingTenants, loadingCompanies };
}
