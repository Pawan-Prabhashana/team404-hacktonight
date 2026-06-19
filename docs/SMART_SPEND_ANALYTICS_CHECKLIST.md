# Smart Spend Analytics Checklist — Phase 8

Manual test checklist for verifying the Phase 8 Smart Spend Analytics Engine.

## API Security

- [ ] `GET /api/smart-spend/summary` returns 401 when not authenticated
- [ ] `GET /api/smart-spend/categories` returns 401 when not authenticated
- [ ] `GET /api/smart-spend/budgets` returns 401 when not authenticated
- [ ] `POST /api/smart-spend/budgets` returns 401 when not authenticated
- [ ] `POST /api/smart-spend/simulate` returns 401 when not authenticated
- [ ] Authenticated user receives only their own analytics data
- [ ] `userId` is never accepted from the request body or query params in any Smart Spend route
- [ ] No stack traces or `DATABASE_URL` are returned in error responses

## Analytics Accuracy

- [ ] Monthly spend matches sum of debit transactions for the current month
- [ ] Credits (incoming transfers, salary) are not counted as spending
- [ ] Internal transfers (own-to-own) are excluded from spend totals
- [ ] Category breakdown correctly assigns `groceries` to supermarket transactions
- [ ] Category breakdown correctly assigns `dining` to restaurant/cafe transactions
- [ ] Category breakdown correctly assigns `transport` to PickMe/Uber/fuel transactions
- [ ] Category breakdown correctly assigns `subscriptions` to Netflix/Spotify
- [ ] Category breakdown correctly assigns `utilities` to CEB/water bill payments
- [ ] Bill payment biller category overrides generic description matching

## Budget Tracking

- [ ] `POST /api/smart-spend/budgets` creates a new budget for a category
- [ ] Re-posting with same `categorySlug` + `period` updates the existing budget (upsert)
- [ ] Over-budget category shows `status: 'over'` in the category breakdown
- [ ] Watch category (75–100% used) shows `status: 'watch'`
- [ ] Budget usage percentage is calculated correctly

## Financial Health Score

- [ ] Score is between 0 and 100
- [ ] Score increases when income exceeds spending
- [ ] Score decreases when spending exceeds income
- [ ] Score decreases when more than 2 categories are over budget

## Smart Spend Features

- [ ] Savings potential > 0 when at least one category is over budget
- [ ] Average daily spend is calculated as monthly spend ÷ days elapsed
- [ ] Recurring payment detection triggers for transactions with similar descriptions
- [ ] Bill payments are always flagged as recurring
- [ ] Cashflow forecast shows a projected month-end balance
- [ ] Forecast warning appears when projected balance is critically low

## Financial Twin Simulator

- [ ] Simulation returns impact level (`low`, `medium`, `high`)
- [ ] Simulation returns projected balance after scenario
- [ ] Simulation does NOT update account balances in the database
- [ ] Simulation does NOT create transactions
- [ ] Warning appears when scenario would overdraft the account
- [ ] Warning appears when scenario exceeds a budget category

## UI

- [ ] Smart Spend page loads with real API data
- [ ] Category breakdown shows progress bars with correct widths
- [ ] Budget save form updates the budget and refreshes data
- [ ] Insights section shows relevant warnings and tips
- [ ] Recurring payments section lists detected subscriptions
- [ ] Cashflow forecast section shows projected balance
- [ ] Financial Twin Simulator form submits and shows result
- [ ] Dashboard Smart Spend card shows real financial health score
- [ ] No overlapping UI elements on any of the above

## Infrastructure

- [ ] App remains on `http://localhost:3000`
- [ ] `npm run build` passes with no errors
- [ ] No secrets or internal error details are exposed to the client

## Demo Credentials

```
Customer: customer@serandib.test / SerandibUser123
Admin:    admin@serandib.test    / SerandibAdmin123
```
