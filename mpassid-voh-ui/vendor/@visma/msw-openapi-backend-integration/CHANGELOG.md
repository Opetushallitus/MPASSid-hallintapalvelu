# 2.0.0

- **Breaking:** rewrite the handler for `msw@2`. `rest` → `http`,
  `res(ctx.status()/ctx.json())` → `HttpResponse`, and the openapi-backend
  request object is built from the Fetch API `Request` (`method`, `path` =
  url minus the server base, `headers`, JSON `body`). `handleRequest()`
  auto-initializes, so no explicit `api.init()`. Requires `msw@^2.0.0`.
  Local fork for mpassid-voh-ui.

# 1.0.1

- Accept `msw@>=0.45.0`

# 1.0.0

- Upgrade to `msw@^0.45.0`
- Upgrade to `openapi-backend@^5.3.0`

# 0.1.2

- Fix ES module usage

# 0.1.1

- Add dynamic mock responses

# 0.1.0

- Initial release
