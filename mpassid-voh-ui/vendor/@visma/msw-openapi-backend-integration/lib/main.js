import { http, HttpResponse } from 'msw';
import OpenAPIBackend from 'openapi-backend';

const _OpenAPIBackend =
  OpenAPIBackend && OpenAPIBackend.__esModule
    ? OpenAPIBackend['default']
    : OpenAPIBackend;

// msw v2 replaced the `rest` object (whose keys the v1 integration enumerated)
// with `http`. Enumerate the HTTP verbs explicitly and omit `http.all`, which
// would otherwise double-register a catch-all handler for every route.
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch'];

export function handlers(options, requestLogicHandlers = {}) {
  const api = new _OpenAPIBackend(options);

  // msw v2 resolvers return a Response/HttpResponse directly instead of the v1
  // `res(ctx.status(), ctx.json())` chain, so the openapi-backend handlers now
  // build an HttpResponse. handleRequest() auto-initializes the api on first
  // call, so no explicit api.init() is needed (matching the v1 integration).
  api.register('notFound', () => new HttpResponse(null, { status: 404 }));

  api.register('notImplemented', (c) => {
    const requestLogicHandler = requestLogicHandlers[c.operation.operationId];
    if (requestLogicHandler) {
      const response = requestLogicHandler(c.request);
      if (response) {
        const { status, mock } = response;
        return HttpResponse.json(mock, { status });
      }
    }
    const { status, mock } = c.api.mockResponseForOperation(
      c.operation.operationId
    );
    return HttpResponse.json(mock, { status });
  });

  return METHODS.flatMap((method) =>
    options.definition.servers.map(({ url }) =>
      http[method](`${url}/*`, async ({ request }) => {
        // Path relative to the server base, query string included: openapi-
        // backend strips the query when routing and re-parses it for
        // c.request.query. Mirrors the v1 `req.url.href.slice(url.length)`.
        const path = request.url.slice(url.length);

        // v2 exposes the request body via the Fetch API. Parse JSON so
        // openapi-backend can populate c.request.requestBody; GET/HEAD and
        // empty/non-JSON bodies throw and fall back to undefined.
        let body;
        try {
          body = await request.clone().json();
        } catch {
          body = undefined;
        }

        return api.handleRequest({
          method: request.method,
          path,
          headers: Object.fromEntries(request.headers),
          body,
        });
      })
    )
  );
}
