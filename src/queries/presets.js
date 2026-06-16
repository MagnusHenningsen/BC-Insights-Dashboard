// All queries accept a `timeFilter` placeholder e.g. "ago(24h)"
// Time series queries must return: timestamp (datetime), value (number), and optionally series (string)
// Metric queries must return: value (number), and optionally label (string)
//
// Duration fields (executionTime, totalTime, serverExecutionTime) are TIMESPAN in format "hh:mm:ss.fffffff".
// Convert to milliseconds with: toreal(totimespan(customDimensions.executionTime)) / 10000

// ─── Detail-query builders (record-level, not aggregates) ─────────────────────
// Each returns individual rows sorted by relevance, capped at 100.

const _slowSqlDetail = (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0005'
| extend
    durMs = toreal(totimespan(customDimensions.executionTime)) / 10000,
    alObjectName = tostring(customDimensions.alObjectName),
    alObjectType = tostring(customDimensions.alObjectType),
    extensionName = tostring(customDimensions.extensionName),
    clientType = tostring(customDimensions.clientType),
    companyName = tostring(customDimensions.companyName),
    sqlStatement = tostring(customDimensions.sqlStatement)
| project timestamp, durMs, alObjectName, alObjectType, extensionName, clientType, companyName, sqlStatement
| order by durMs desc
| take 100`;

const _slowAlDetail = (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0018'
| extend
    durMs = toreal(totimespan(customDimensions.executionTime)) / 10000,
    alObjectName = tostring(customDimensions.alObjectName),
    alObjectType = tostring(customDimensions.alObjectType),
    extensionName = tostring(customDimensions.extensionName),
    clientType = tostring(customDimensions.clientType),
    companyName = tostring(customDimensions.companyName),
    alStackTrace = tostring(customDimensions.alStackTrace)
| project timestamp, durMs, alObjectName, alObjectType, extensionName, clientType, companyName, alStackTrace
| order by durMs desc
| take 100`;

const _errorDialogDetail = (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0030'
| extend
    failureReason = tostring(customDimensions.failureReason),
    alObjectName = tostring(customDimensions.alObjectName),
    alObjectType = tostring(customDimensions.alObjectType),
    extensionName = tostring(customDimensions.extensionName),
    clientType = tostring(customDimensions.clientType),
    companyName = tostring(customDimensions.companyName),
    alStackTrace = tostring(customDimensions.alStackTrace)
| project timestamp, failureReason, alObjectName, alObjectType, extensionName, clientType, companyName, alStackTrace
| order by timestamp desc
| take 100`;

const _permissionErrorDetail = (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0031'
| extend
    permissionObjectType = tostring(customDimensions.permissionObjectType),
    permissionObjectId = tostring(customDimensions.permissionObjectId),
    permissionObjectName = tostring(customDimensions.permissionObjectName),
    alObjectName = tostring(customDimensions.alObjectName),
    clientType = tostring(customDimensions.clientType),
    companyName = tostring(customDimensions.companyName),
    userTelemetryId = tostring(customDimensions.usertelemetryid)
| project timestamp, permissionObjectType, permissionObjectId, permissionObjectName, alObjectName, clientType, companyName, userTelemetryId
| order by timestamp desc
| take 100`;

const _lockTimeoutDetail = (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0012'
| extend
    alObjectName = tostring(customDimensions.alObjectName),
    alObjectType = tostring(customDimensions.alObjectType),
    extensionName = tostring(customDimensions.extensionName),
    clientType = tostring(customDimensions.clientType),
    companyName = tostring(customDimensions.companyName),
    snapshotId = tostring(customDimensions.snapshotId),
    sqlStatement = tostring(customDimensions.sqlStatement),
    alStackTrace = tostring(customDimensions.alStackTrace)
| project timestamp, alObjectName, alObjectType, extensionName, clientType, companyName, snapshotId, sqlStatement, alStackTrace
| order by timestamp desc
| take 100`;

const _deadlockDetail = (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0028'
| extend
    alObjectName = tostring(customDimensions.alObjectName),
    alObjectType = tostring(customDimensions.alObjectType),
    extensionName = tostring(customDimensions.extensionName),
    clientType = tostring(customDimensions.clientType),
    companyName = tostring(customDimensions.companyName),
    sqlStatement = tostring(customDimensions.sqlStatement),
    deadlockGraph = tostring(customDimensions.deadlockGraph),
    alStackTrace = tostring(customDimensions.alStackTrace)
| extend
    lockedObjects = strcat_array(extract_all(@'objectname="([^"]+)"', deadlockGraph), ', '),
    lockedIndexes = strcat_array(extract_all(@'indexname="([^"]+)"', deadlockGraph), ', '),
    waitResource = extract(@'waitresource="([^"]+)"', 1, deadlockGraph),
    allSql = strcat_array(extract_all(@'<inputbuf>([^<]+)</inputbuf>', deadlockGraph), ' || ')
| project timestamp, alObjectName, alObjectType, extensionName, clientType, companyName,
    sqlStatement, lockedObjects, lockedIndexes, waitResource, allSql, deadlockGraph, alStackTrace
| order by timestamp desc
| take 100`;

const _reportDetail = (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0006'
| extend
    reportName = tostring(customDimensions.alObjectName),
    reportId = tostring(customDimensions.alObjectId),
    durMs = toreal(totimespan(customDimensions.totalTime)) / 10000,
    result = tostring(customDimensions.result),
    extensionName = tostring(customDimensions.extensionName),
    clientType = tostring(customDimensions.clientType),
    companyName = tostring(customDimensions.companyName)
| project timestamp, reportName, reportId, result, durMs, extensionName, clientType, companyName
| order by timestamp desc
| take 100`;

const _webServiceDetail = (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0008'
| extend
    endpointName = tostring(customDimensions.endpointName),
    category = tostring(customDimensions.category),
    httpStatusCode = tostring(customDimensions.httpStatusCode),
    durMs = toreal(totimespan(customDimensions.serverExecutionTime)) / 10000,
    companyName = tostring(customDimensions.companyName)
| project timestamp, category, endpointName, httpStatusCode, durMs, companyName
| order by timestamp desc
| take 100`;

const _jobQueueErrorDetail = (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'AL0000HE7'
| extend
    jobDescription = tostring(customDimensions.alJobQueueObjectDescription),
    jobCategoryCode = tostring(customDimensions.alJobQueueCategoryCode),
    isRecurring = tostring(customDimensions.alJobQueueIsRecurring),
    scheduledTaskId = tostring(customDimensions.alJobQueueScheduledTaskId),
    companyName = tostring(customDimensions.companyName)
| project timestamp, jobDescription, jobCategoryCode, isRecurring, scheduledTaskId, companyName
| order by timestamp desc
| take 100`;

// Top-5-company multi-series helper — same pattern as the by-object queries
const _byCompany = (tf, bucket, eventId) => `let topCompanies = traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == '${eventId}'
| extend company = tostring(customDimensions.companyName)
| where isnotempty(company)
| summarize cnt=count() by company
| top 5 by cnt desc
| project company;
traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == '${eventId}'
| extend company = tostring(customDimensions.companyName)
| where company in (topCompanies)
| make-series value=count() default=0 on timestamp from bin(${tf}, ${bucket}) to now() step ${bucket} by series=company
| mv-expand timestamp to typeof(datetime), value to typeof(long)
| order by timestamp asc`;

export const PRESET_QUERIES = [
  // ─── Slow SQL (RT0005) ────────────────────────────────────────────────────
  {
    id: 'slow_sql_count',
    name: 'Slow SQL count over time',
    description: 'Number of RT0005 slow SQL query events per time bucket',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#378ADD',
    detailKql: _slowSqlDetail,
    kql: (tf, bucket) => `range timestamp from bin(${tf}, ${bucket}) to now() step ${bucket}
| join kind=leftouter (
    traces
    | where timestamp >= ${tf}
    | where tostring(customDimensions.eventId) == 'RT0005'
    | summarize value=count() by bin(timestamp, ${bucket})
) on timestamp
| extend value = coalesce(value, long(0))
| project timestamp, value
| order by timestamp asc`,
  },
  {
    id: 'slow_sql_avg_duration',
    name: 'Slow SQL avg duration over time',
    description: 'Average RT0005 execution time per bucket (ms). executionTime is a TIMESPAN field.',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#378ADD',
    detailKql: _slowSqlDetail,
    kql: (tf, bucket) => `range timestamp from bin(${tf}, ${bucket}) to now() step ${bucket}
| join kind=leftouter (
    traces
    | where timestamp >= ${tf}
    | where tostring(customDimensions.eventId) == 'RT0005'
    | extend durMs = toreal(totimespan(customDimensions.executionTime)) / 10000
    | where isnotnull(durMs)
    | summarize value=avg(durMs) by bin(timestamp, ${bucket})
) on timestamp
| extend value = coalesce(value, real(0))
| project timestamp, value
| order by timestamp asc`,
  },
  {
    id: 'slow_sql_by_object',
    name: 'Slow SQL by AL object',
    description: 'Top 5 AL objects triggering slow SQL queries, as separate series',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#378ADD',
    detailKql: _slowSqlDetail,
    kql: (tf, bucket) => `let topObjects = traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0005'
| extend obj = tostring(customDimensions.alObjectName)
| where isnotempty(obj)
| summarize cnt=count() by obj
| top 5 by cnt desc
| project obj;
traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0005'
| extend obj = tostring(customDimensions.alObjectName)
| where obj in (topObjects)
| make-series value=count() default=0 on timestamp from bin(${tf}, ${bucket}) to now() step ${bucket} by series=obj
| mv-expand timestamp to typeof(datetime), value to typeof(long)
| order by timestamp asc`,
  },

  {
    id: 'slow_sql_by_company',
    name: 'Slow SQL by company',
    description: 'RT0005 slow SQL events broken down by top 5 companies over time',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#378ADD',
    detailKql: _slowSqlDetail,
    kql: (tf, bucket) => _byCompany(tf, bucket, 'RT0005'),
  },

  // ─── Slow AL method (RT0018) ─────────────────────────────────────────────
  {
    id: 'slow_al_count',
    name: 'Slow AL count over time',
    description: 'Number of RT0018 slow AL method events per time bucket',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#EF9F27',
    detailKql: _slowAlDetail,
    kql: (tf, bucket) => `range timestamp from bin(${tf}, ${bucket}) to now() step ${bucket}
| join kind=leftouter (
    traces
    | where timestamp >= ${tf}
    | where tostring(customDimensions.eventId) == 'RT0018'
    | summarize value=count() by bin(timestamp, ${bucket})
) on timestamp
| extend value = coalesce(value, long(0))
| project timestamp, value
| order by timestamp asc`,
  },
  {
    id: 'slow_al_avg_duration',
    name: 'Slow AL avg duration over time',
    description: 'Average RT0018 AL method execution time per bucket (ms). executionTime is a TIMESPAN field.',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#EF9F27',
    detailKql: _slowAlDetail,
    kql: (tf, bucket) => `range timestamp from bin(${tf}, ${bucket}) to now() step ${bucket}
| join kind=leftouter (
    traces
    | where timestamp >= ${tf}
    | where tostring(customDimensions.eventId) == 'RT0018'
    | extend durMs = toreal(totimespan(customDimensions.executionTime)) / 10000
    | where isnotnull(durMs)
    | summarize value=avg(durMs) by bin(timestamp, ${bucket})
) on timestamp
| extend value = coalesce(value, real(0))
| project timestamp, value
| order by timestamp asc`,
  },
  {
    id: 'slow_al_by_object',
    name: 'Slow AL by object',
    description: 'Top 5 AL objects/codeunits causing slow AL methods, as separate series',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#EF9F27',
    detailKql: _slowAlDetail,
    kql: (tf, bucket) => `let topObjects = traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0018'
| extend obj = tostring(customDimensions.alObjectName)
| where isnotempty(obj)
| summarize cnt=count() by obj
| top 5 by cnt desc
| project obj;
traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0018'
| extend obj = tostring(customDimensions.alObjectName)
| where obj in (topObjects)
| make-series value=count() default=0 on timestamp from bin(${tf}, ${bucket}) to now() step ${bucket} by series=obj
| mv-expand timestamp to typeof(datetime), value to typeof(long)
| order by timestamp asc`,
  },

  {
    id: 'slow_al_by_company',
    name: 'Slow AL by company',
    description: 'RT0018 slow AL method events broken down by top 5 companies over time',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#EF9F27',
    detailKql: _slowAlDetail,
    kql: (tf, bucket) => _byCompany(tf, bucket, 'RT0018'),
  },

  // ─── Error dialogs (RT0030) ───────────────────────────────────────────────
  {
    id: 'error_dialog_count',
    name: 'Error dialogs over time',
    description: 'RT0030 error dialog shown events per bucket (actual user-facing errors)',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#E24B4A',
    detailKql: _errorDialogDetail,
    kql: (tf, bucket) => `range timestamp from bin(${tf}, ${bucket}) to now() step ${bucket}
| join kind=leftouter (
    traces
    | where timestamp >= ${tf}
    | where tostring(customDimensions.eventId) == 'RT0030'
    | summarize value=count() by bin(timestamp, ${bucket})
) on timestamp
| extend value = coalesce(value, long(0))
| project timestamp, value
| order by timestamp asc`,
  },
  {
    id: 'errors_by_reason',
    name: 'Errors by failure reason',
    description: 'RT0030 error dialogs broken down by top 5 failure reasons over time',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#E24B4A',
    detailKql: _errorDialogDetail,
    kql: (tf, bucket) => `let topReasons = traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0030'
| extend reason = tostring(customDimensions.failureReason)
| where isnotempty(reason)
| summarize cnt=count() by reason
| top 5 by cnt desc
| project reason;
traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0030'
| extend reason = tostring(customDimensions.failureReason)
| where reason in (topReasons)
| make-series value=count() default=0 on timestamp from bin(${tf}, ${bucket}) to now() step ${bucket} by series=reason
| mv-expand timestamp to typeof(datetime), value to typeof(long)
| order by timestamp asc`,
  },

  {
    id: 'error_dialog_by_company',
    name: 'Error dialogs by company',
    description: 'RT0030 error dialog events broken down by top 5 companies over time',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#E24B4A',
    detailKql: _errorDialogDetail,
    kql: (tf, bucket) => _byCompany(tf, bucket, 'RT0030'),
  },

  // ─── Permission errors (RT0031) ───────────────────────────────────────────
  {
    id: 'permission_errors',
    name: 'Permission errors over time',
    description: 'RT0031 permission error shown events per bucket',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#D85A30',
    detailKql: _permissionErrorDetail,
    kql: (tf, bucket) => `range timestamp from bin(${tf}, ${bucket}) to now() step ${bucket}
| join kind=leftouter (
    traces
    | where timestamp >= ${tf}
    | where tostring(customDimensions.eventId) == 'RT0031'
    | summarize value=count() by bin(timestamp, ${bucket})
) on timestamp
| extend value = coalesce(value, long(0))
| project timestamp, value
| order by timestamp asc`,
  },

  {
    id: 'permission_errors_by_company',
    name: 'Permission errors by company',
    description: 'RT0031 permission error events broken down by top 5 companies over time',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#D85A30',
    detailKql: _permissionErrorDetail,
    kql: (tf, bucket) => _byCompany(tf, bucket, 'RT0031'),
  },

  // ─── Database lock timeouts (RT0012) ─────────────────────────────────────
  {
    id: 'lock_timeouts',
    name: 'Lock timeouts over time',
    description: 'RT0012 database lock timeout events per bucket — indicates contention between sessions',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#885A89',
    detailKql: _lockTimeoutDetail,
    kql: (tf, bucket) => `range timestamp from bin(${tf}, ${bucket}) to now() step ${bucket}
| join kind=leftouter (
    traces
    | where timestamp >= ${tf}
    | where tostring(customDimensions.eventId) == 'RT0012'
    | summarize value=count() by bin(timestamp, ${bucket})
) on timestamp
| extend value = coalesce(value, long(0))
| project timestamp, value
| order by timestamp asc`,
  },
  {
    id: 'lock_timeouts_by_object',
    name: 'Lock timeouts by AL object',
    description: 'Top 5 AL objects involved in RT0012 lock timeout victims, as separate series',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#885A89',
    detailKql: _lockTimeoutDetail,
    kql: (tf, bucket) => `let topObjects = traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0012'
| extend obj = tostring(customDimensions.alObjectName)
| where isnotempty(obj)
| summarize cnt=count() by obj
| top 5 by cnt desc
| project obj;
traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0012'
| extend obj = tostring(customDimensions.alObjectName)
| where obj in (topObjects)
| make-series value=count() default=0 on timestamp from bin(${tf}, ${bucket}) to now() step ${bucket} by series=obj
| mv-expand timestamp to typeof(datetime), value to typeof(long)
| order by timestamp asc`,
  },

  {
    id: 'lock_timeouts_by_company',
    name: 'Lock timeouts by company',
    description: 'RT0012 lock timeout events broken down by top 5 companies over time',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#885A89',
    detailKql: _lockTimeoutDetail,
    kql: (tf, bucket) => _byCompany(tf, bucket, 'RT0012'),
  },

  // ─── Deadlocks (RT0028) ───────────────────────────────────────────────────
  {
    id: 'deadlocks',
    name: 'Deadlocks over time',
    description: 'RT0028 database deadlock occurred events per bucket',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#D4537E',
    detailKql: _deadlockDetail,
    kql: (tf, bucket) => `range timestamp from bin(${tf}, ${bucket}) to now() step ${bucket}
| join kind=leftouter (
    traces
    | where timestamp >= ${tf}
    | where tostring(customDimensions.eventId) == 'RT0028'
    | summarize value=count() by bin(timestamp, ${bucket})
) on timestamp
| extend value = coalesce(value, long(0))
| project timestamp, value
| order by timestamp asc`,
  },

  {
    id: 'deadlocks_by_company',
    name: 'Deadlocks by company',
    description: 'RT0028 deadlock events broken down by top 5 companies over time',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#D4537E',
    detailKql: _deadlockDetail,
    kql: (tf, bucket) => _byCompany(tf, bucket, 'RT0028'),
  },

  // ─── Report rendering (RT0006) ────────────────────────────────────────────
  {
    id: 'report_rendering',
    name: 'Report rendering over time',
    description: 'RT0006 report render events (success + failure) per bucket',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#1D9E75',
    detailKql: _reportDetail,
    kql: (tf, bucket) => `range timestamp from bin(${tf}, ${bucket}) to now() step ${bucket}
| join kind=leftouter (
    traces
    | where timestamp >= ${tf}
    | where tostring(customDimensions.eventId) == 'RT0006'
    | summarize value=count() by bin(timestamp, ${bucket})
) on timestamp
| extend value = coalesce(value, long(0))
| project timestamp, value
| order by timestamp asc`,
  },
  {
    id: 'report_avg_duration',
    name: 'Report avg render duration over time',
    description: 'Average RT0006 report totalTime per bucket (ms). totalTime is a TIMESPAN field.',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#1D9E75',
    detailKql: _reportDetail,
    kql: (tf, bucket) => `range timestamp from bin(${tf}, ${bucket}) to now() step ${bucket}
| join kind=leftouter (
    traces
    | where timestamp >= ${tf}
    | where tostring(customDimensions.eventId) == 'RT0006'
    | where tostring(customDimensions.result) == 'Success'
    | extend durMs = toreal(totimespan(customDimensions.totalTime)) / 10000
    | where isnotnull(durMs)
    | summarize value=avg(durMs) by bin(timestamp, ${bucket})
) on timestamp
| extend value = coalesce(value, real(0))
| project timestamp, value
| order by timestamp asc`,
  },

  {
    id: 'report_by_company',
    name: 'Report rendering by company',
    description: 'RT0006 report render events broken down by top 5 companies over time',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#1D9E75',
    detailKql: _reportDetail,
    kql: (tf, bucket) => _byCompany(tf, bucket, 'RT0006'),
  },

  // ─── Web service calls (RT0008) ───────────────────────────────────────────
  {
    id: 'web_service_calls',
    name: 'Incoming web service calls over time',
    description: 'RT0008 web service calls (SOAP/OData) per bucket, split by protocol',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#639922',
    detailKql: _webServiceDetail,
    kql: (tf, bucket) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0008'
| extend protocol = tostring(customDimensions.category)
| make-series value=count() default=0 on timestamp from bin(${tf}, ${bucket}) to now() step ${bucket} by series=protocol
| mv-expand timestamp to typeof(datetime), value to typeof(long)
| order by timestamp asc`,
  },

  {
    id: 'web_service_by_company',
    name: 'Web service calls by company',
    description: 'RT0008 incoming web service calls broken down by top 5 companies over time',
    type: 'timeseries',
    defaultChartType: 'area',
    color: '#639922',
    detailKql: _webServiceDetail,
    kql: (tf, bucket) => _byCompany(tf, bucket, 'RT0008'),
  },

  // ─── Metric (single number) queries ──────────────────────────────────────
  {
    id: 'metric_total_slow_sql',
    name: 'Total slow SQL events',
    description: 'Single count of RT0005 slow SQL events in window',
    type: 'metric',
    color: '#378ADD',
    detailKql: _slowSqlDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0005'
| count`,
  },
  {
    id: 'metric_avg_sql_duration',
    name: 'Avg slow SQL duration',
    description: 'Average RT0005 execution time across window (ms)',
    type: 'metric',
    unit: 'ms',
    color: '#378ADD',
    detailKql: _slowSqlDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0005'
| extend durMs = toreal(totimespan(customDimensions.executionTime)) / 10000
| where isnotnull(durMs)
| summarize value=avg(durMs)`,
  },
  {
    id: 'metric_p95_sql_duration',
    name: 'P95 slow SQL duration',
    description: '95th percentile RT0005 execution time (ms)',
    type: 'metric',
    unit: 'ms',
    color: '#7F77DD',
    detailKql: _slowSqlDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0005'
| extend durMs = toreal(totimespan(customDimensions.executionTime)) / 10000
| where isnotnull(durMs)
| summarize value=percentile(durMs, 95)`,
  },
  {
    id: 'metric_total_slow_al',
    name: 'Total slow AL events',
    description: 'Single count of RT0018 slow AL method events in window',
    type: 'metric',
    color: '#EF9F27',
    detailKql: _slowAlDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0018'
| count`,
  },
  {
    id: 'metric_avg_al_duration',
    name: 'Avg slow AL duration',
    description: 'Average RT0018 AL method execution time across window (ms)',
    type: 'metric',
    unit: 'ms',
    color: '#EF9F27',
    detailKql: _slowAlDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0018'
| extend durMs = toreal(totimespan(customDimensions.executionTime)) / 10000
| where isnotnull(durMs)
| summarize value=avg(durMs)`,
  },
  {
    id: 'metric_p95_al_duration',
    name: 'P95 slow AL duration',
    description: '95th percentile RT0018 AL method execution time (ms)',
    type: 'metric',
    unit: 'ms',
    color: '#EF9F27',
    detailKql: _slowAlDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0018'
| extend durMs = toreal(totimespan(customDimensions.executionTime)) / 10000
| where isnotnull(durMs)
| summarize value=percentile(durMs, 95)`,
  },
  {
    id: 'metric_total_errors',
    name: 'Total error dialogs',
    description: 'Single count of RT0030 error dialog events shown to users in window',
    type: 'metric',
    color: '#E24B4A',
    detailKql: _errorDialogDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0030'
| count`,
  },
  {
    id: 'metric_permission_errors',
    name: 'Total permission errors',
    description: 'Single count of RT0031 permission error dialog events in window',
    type: 'metric',
    color: '#D85A30',
    detailKql: _permissionErrorDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0031'
| count`,
  },
  {
    id: 'metric_lock_timeout_count',
    name: 'Total lock timeouts',
    description: 'Single count of RT0012 database lock timeout events in window',
    type: 'metric',
    color: '#885A89',
    detailKql: _lockTimeoutDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0012'
| count`,
  },
  {
    id: 'metric_deadlock_count',
    name: 'Total deadlocks',
    description: 'Single count of RT0028 database deadlock events in window',
    type: 'metric',
    color: '#D4537E',
    detailKql: _deadlockDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0028'
| count`,
  },
  {
    id: 'metric_report_failures',
    name: 'Report rendering failures',
    description: 'Count of RT0006 events where rendering failed in window',
    type: 'metric',
    color: '#1D9E75',
    detailKql: _reportDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0006'
| where tostring(customDimensions.result) != 'Success'
| count`,
  },
  {
    id: 'metric_job_queue_errors',
    name: 'Job queue errors',
    description: 'Count of AL0000HE7 job queue entry errored events in window',
    type: 'metric',
    color: '#D85A30',
    detailKql: _jobQueueErrorDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'AL0000HE7'
| count`,
  },
  {
    id: 'metric_web_service_calls',
    name: 'Incoming web service calls',
    description: 'Count of RT0008 incoming SOAP/OData web service calls in window',
    type: 'metric',
    color: '#639922',
    detailKql: _webServiceDetail,
    kql: (tf) => `traces
| where timestamp >= ${tf}
| where tostring(customDimensions.eventId) == 'RT0008'
| count`,
  },
];

// Default layout — one box per preset, in display order
let _uid = 1000;
export const DEFAULT_BOXES = PRESET_QUERIES.map((q) => ({
  id: String(++_uid),
  presetId: q.id,
  name: q.name,
  description: q.description,
  type: q.type,
  chartType: q.defaultChartType || 'area',
  color: q.color || '#378ADD',
  unit: q.unit,
  visible: true,
}));

export const TIME_RANGES = [
  { label: 'Last 1h',  value: '1h',  hours: 1,   bucket: '5m'  },
  { label: 'Last 6h',  value: '6h',  hours: 6,   bucket: '30m' },
  { label: 'Last 24h', value: '24h', hours: 24,  bucket: '2h'  },
  { label: 'Last 48h', value: '48h', hours: 48,  bucket: '4h'  },
  { label: 'Last 7d',  value: '7d',  hours: 168, bucket: '12h' },
  { label: 'Last 30d', value: '30d', hours: 720, bucket: '1d'  }
];

export const CHART_TYPES = [
  { value: 'line',  label: 'Line'  },
  { value: 'bar',   label: 'Bar'   },
  { value: 'area',  label: 'Area'  },
];

export const SERIES_COLORS = [
  '#378ADD', '#EF9F27', '#1D9E75', '#D4537E',
  '#7F77DD', '#D85A30', '#639922', '#885A89',
];

// Queries to fetch distinct tenant IDs and company names
export const TENANT_LIST_KQL = `traces
| where timestamp >= ago(7d)
| extend tenant = tostring(customDimensions.aadTenantId)
| where isnotempty(tenant) and tenant != 'common'
| summarize count() by tenant
| order by count_ desc
| project tenant`;

export const COMPANY_LIST_KQL = (tenantId) => `traces
| where timestamp >= ago(7d)
${tenantId ? `| where tostring(customDimensions.aadTenantId) == '${tenantId}'` : ''}
| extend company = tostring(customDimensions.companyName)
| where isnotempty(company)
| summarize count() by company
| order by count_ desc
| project company`;

// Inject both tenant and company filters into a KQL string
export function injectFilters(kql, { tenantId, companyName }) {
  if (!tenantId && !companyName) return kql;
  const lines = [];
  if (tenantId) lines.push(`| where tostring(customDimensions.aadTenantId) == '${tenantId}'`);
  if (companyName) lines.push(`| where tostring(customDimensions.companyName) == '${companyName}'`);
  const filter = lines.join('\n');
  return kql.replace(
    /(^\s*\|?\s*where\s+timestamp[^\n]*)/m,
    `$1\n${filter}`
  );
}
