# Angular HTTP and the QUERY method

Office Orbit calls the Work Tracker Worker through Angular `HttpClient`. Feature services own endpoint-specific request and response types. Authentication remains centralized in `authInterceptor`; feature code must not read tokens or construct an `Authorization` header.

## HTTP QUERY

`QUERY` is the read-only HTTP method supported by the Worker for structured queries. It is useful when a read needs a JSON body that would be awkward or too large for URL query parameters. It does not mean GraphQL and it is not Angular's `HttpClient.get()` method.

Angular has no `http.query()` shortcut, so use `HttpClient.request()`:

```ts
interface QueryRequest<TFilters> {
  filters: TFilters;
  pageSize: number;
  cursor: string | null;
  includeRelations: boolean;
}

interface ListResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
}

return http.request<ListResponse<JiraOption>>('QUERY', `${environment.apiBaseUrl}/api/jiras/options`, {
  body: request,
});
```

Office Orbit wraps this in `MutationApiService.query()` so features use the same typed transport and timeout:

```ts
@Service()
export class JiraPickerService {
  private readonly api = inject(MutationApiService);

  query(q = '', cursor: string | null = null) {
    const search = q.trim();
    const request: QueryRequest<JiraOptionQueryFilters> = {
      filters: search ? { q: search } : {},
      pageSize: 20,
      cursor,
      includeRelations: false,
    };

    return this.api.query<JiraOption, JiraOptionQueryFilters>('/api/jiras/options', request);
  }
}
```

The resulting network request is:

```http
QUERY /api/jiras/options HTTP/1.1
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "filters": { "q": "DEVOPS" },
  "pageSize": 20,
  "cursor": null,
  "includeRelations": false
}
```

An empty JIRA search sends `filters: {}` and the Worker returns current-Sprint JIRAs. A non-empty `q` searches all JIRAs by key or summary. The client must preserve the opaque `nextCursor` exactly, reuse it only with the same filters, and fetch another page only after an explicit Load more action.

Do not replace `QUERY` with `POST`, put the filter body into URL parameters, or call `fetch()` directly. The Worker must allow `QUERY` in its CORS configuration and preflight response.

## GET

Use `GET` for ordinary reads whose options fit naturally in the URL:

```ts
const params = new HttpParams().set('pageSize', 25).set('include', 'relations');

return http.get<ListResponse<Task>>(`${environment.apiBaseUrl}/api/tasks`, { params });
```

`HttpParams` is immutable. Assign the result of every `.set()` or `.append()` call. URL-encode path identifiers with `encodeURIComponent()` before inserting them into a URL.

## POST

Use `POST` to create a resource or invoke a command endpoint:

```ts
const body: TaskCreateRequest = {
  task: 'Review release notes',
  statusOptionId: null,
  priorityOptionId: null,
  responsibilityOptionId: null,
  requestedBy: '',
  requestedByTypeOptionId: null,
  assignedTo: '',
  assignedToTypeOptionId: null,
  dueDate: null,
  followUpDate: null,
  completedDate: null,
  companyId: null,
  jiraIds: [],
  notes: '',
  outcomeUpdate: '',
};

return http.post<MutationResponse<Task>>(`${environment.apiBaseUrl}/api/tasks`, body);
```

Angular serializes plain objects as JSON and supplies the JSON content type. Do not manually set a multipart content type when sending `FormData`; the browser must add its boundary.

## PATCH

Use `PATCH` for partial updates. Send only writable fields accepted by the endpoint:

```ts
const body: TaskPatchRequest = { statusOptionId: selectedStatusId };

return http.patch<MutationResponse<Task>>(`${environment.apiBaseUrl}/api/tasks/${encodeURIComponent(taskId)}`, body);
```

## DELETE

Use `DELETE` for endpoints that support deletion:

```ts
return http.delete<void>(`${environment.apiBaseUrl}/api/tasks/${encodeURIComponent(taskId)}`);
```

Bulk deletion in Office Orbit is a command with a JSON body and therefore uses `POST /bulk-delete`.

## Headers and authentication

The authentication interceptor recognizes protected Worker `/api/*` requests and clones them with the current bearer token:

```ts
const outgoing = request.clone({
  setHeaders: { Authorization: `Bearer ${session.accessToken}` },
});
```

This applies to `GET`, `QUERY`, `POST`, `PATCH`, and `DELETE`. Feature services should not send the token themselves.

For a non-authentication header local to one request, use `HttpHeaders` or `setHeaders`:

```ts
const headers = new HttpHeaders({ Accept: 'application/json' });
return http.get<ResponseModel>(url, { headers });
```

Interceptors are preferable for headers that apply consistently across the application. Never add browser-controlled CORS response headers such as `Access-Control-Allow-Origin` to client requests; those belong to the Worker response.

## Subscribing and cancellation

`HttpClient` methods return cold Observables. A request starts when code subscribes. In components, use `takeUntilDestroyed()` for lifecycle cleanup. For search, debounce input and use `switchMap()` so a newer term unsubscribes the older request:

```ts
searchTerms
  .pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(q => jiraPicker.query(q)),
    takeUntilDestroyed(),
  )
  .subscribe(response => results.set(response.data));
```

Handle errors with the shared `apiError()` mapper and show an inline retry state or `SnackbarService` message as appropriate. Do not retry mutations automatically.

## Testing requests

Use `provideHttpClientTesting()` and `HttpTestingController` to verify the exact method, URL, body, and headers:

```ts
service.query('DEVOPS').subscribe();

const request = http.expectOne(`${environment.apiBaseUrl}/api/jiras/options`);
expect(request.request.method).toBe('QUERY');
expect(request.request.body).toEqual({
  filters: { q: 'DEVOPS' },
  pageSize: 20,
  cursor: null,
  includeRelations: false,
});
```

The existing authentication interceptor test separately verifies that bearer authentication is attached to literal `QUERY` requests.
