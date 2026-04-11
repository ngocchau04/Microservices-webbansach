# Manual E2E Checklist

Use this checklist after booting stack (`docker-compose.micro.yml` or local services).

## Preconditions

- Web reachable at `http://localhost:5173`
- Gateway health OK at `http://localhost:8080/health`
- Service health endpoints return success

## Core Flow

1. Login/Register
- Register a new account
- Verify account
- Login succeeds and token is stored

2. Browse Catalog
- Open product list
- Search by keyword/author/category
- Open product detail

3. Cart + Voucher + Checkout
- Add product to cart
- Update quantity
- Apply valid voucher
- Place order (COD or mock payment)

4. Admin Order Update
- Open admin order page
- Update status (`pending -> processing -> completed`)
- Verify order state is updated on user order history

5. Dashboard Reflection
- Open admin dashboard
- Verify revenue/order-status/top-products are updated

6. Support Flow
- Submit feedback/ticket
- Admin lists feedback
- Admin updates feedback status

## Pass Criteria

- No direct frontend calls to `localhost:400x`
- All API traffic goes through gateway (`/api/*`)
- Main flow works end-to-end without legacy backend dependency
