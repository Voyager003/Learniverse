# External API Timeout / Fallback Test Template

This project currently has no production external API integration in the backend.
Use this template when an external adapter is introduced.

## 1. Design rule

- Do not call external SDK directly from service logic.
- Create a port interface (adapter boundary), then inject implementation.
- Keep timeout and fallback behavior inside the adapter/application service.

## 2. Example interface

```ts
export interface RecommendationPort {
  getRecommendations(userId: string): Promise<string[]>;
}
```

## 3. Integration test template

- Given external adapter timeout
- When service endpoint is requested
- Then:
  - API returns fallback-safe response (status and body contract)
  - timeout is logged
  - core transaction path is not broken

## 4. E2E test template

1. Start app with test adapter that can switch between:
   - success mode
   - timeout mode
2. Call target endpoint in timeout mode
3. Verify:
   - expected fallback response
   - DB side effects stay consistent
   - no leaked internal error message

## 5. Error contract checklist

- Status code is intentional (`4xx` or `5xx`)
- `message` is user-safe
- `timestamp` exists
- retry-safe behavior is documented (idempotency impact)
