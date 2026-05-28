<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UI Agent Rule

For any UI change (especially React/Ant Design work in `.tsx` files), use the `antd-modern` agent first to ensure non-deprecated Ant Design APIs and warning-free updates.
