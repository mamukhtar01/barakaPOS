---
applyTo: "**/*.tsx"
description: "When making UI changes, route through antd-modern to avoid deprecated Ant Design APIs and console warnings."
---

For any UI-related change in this workspace:
- Use the `antd-modern` agent.
- Treat Ant Design deprecation warnings as errors.
- Do not introduce deprecated Ant Design APIs.
- If touched code contains deprecated Ant Design usage, migrate it in the same change.
