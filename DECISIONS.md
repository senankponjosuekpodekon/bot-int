# Decision record — multi-business data isolation

## 1. Scope enum — V1

`scope` is an enum with only two values:

```ts
enum KnowledgeScope {
  AGENT = 'agent',
  BUSINESS = 'business',
}
```

- `agent`: visible by the single agent that owns it.
- `business`: visible by all agents of the same `businessId`.

`tenant` is explicitly excluded from V1. No piece of data will be shared across all businesses of a tenant unless it is first duplicated into each business.

## 2. Existing `shared=true` migration

For every existing tenant, the migration creates **one default business**. All existing agents and all data carrying `agentId` or `tenantId` are attached to that default business. Every existing document currently marked `shared=true` becomes `scope='business'` inside this default business.

This means the pre-existing sharing behaviour is preserved **only within the original single business of the tenant**, never across multiple businesses.

## 3. businessId migration strategy

All `businessId` columns are created as **nullable**, filled by a backfill script, then switched to `NOT NULL` once validated. Composite indexes `(tenantId, businessId, agentId)` are created at the same time as the columns.

## 4. Fail-closed policy

Any detected context leak (data with a different `agentId` or `businessId` than the active agent/business injected into the LLM prompt) blocks the response and logs an alert, rather than returning a warning.
