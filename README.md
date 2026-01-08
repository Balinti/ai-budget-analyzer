# AI Budget Analyzer

A "Safe-to-Spend" cash-flow copilot for irregular-income workers that forecasts upcoming bills/income and tells you how much you can safely spend today/this week without missing bills.

## Features

- **Safe-to-Spend Calculator**: Know exactly how much you can spend today and this week
- **Bill & Income Forecasting**: Automatically detect recurring patterns from your transactions
- **Risk Warnings**: Get early alerts when upcoming bills might put you in the red
- **CSV Import**: Import transactions from any bank via CSV export
- **Smart Detection**: Automatically finds recurring bills and income in your transaction history
- **Privacy First**: Your data stays yours - no selling, no sharing

## Tech Stack

- **Framework**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe (Subscriptions)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account (optional, for paid features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ai-budget-analyzer.git
cd ai-budget-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional (for Stripe)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID=price_xxxxx
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_xxxxx
```

5. Set up the database:
   - Go to your Supabase dashboard
   - Open the SQL editor
   - Run the contents of `supabase/schema.sql`

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

The app uses the following tables:

- `profiles` - User settings (timezone, currency, buffer amount)
- `manual_balances` - User's current account balances
- `transactions` - Imported transactions from CSV
- `anchors` - Recurring bills and income sources
- `forecasts` - Computed daily projections
- `subscriptions` - Stripe subscription state

All tables have Row Level Security (RLS) enabled.

## API Routes

- `POST /api/stripe/checkout` - Create Stripe checkout session
- `POST /api/stripe/portal` - Create Stripe billing portal session
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `POST /api/csv/parse` - Parse uploaded CSV files
- `POST /api/forecast/recompute` - Recompute safe-to-spend forecast

## UI Pages

- `/` - Marketing landing page
- `/login` - Sign in
- `/signup` - Create account
- `/app` - Dashboard with safe-to-spend
- `/app/upload` - CSV import
- `/app/anchors` - Manage bills & income
- `/app/forecast` - Calendar/list forecast view
- `/app/settings` - Account settings
- `/app/billing` - Subscription management

## Environment Variables

### Required

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

### Optional (Stripe)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (server-side only) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID` | Price ID for Plus plan |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Price ID for Pro plan |

If Stripe variables are not set, the app works in free mode with upgrade UI hidden.

## Deployment

### Deploy to Vercel

```bash
git init
gh repo create ai-budget-analyzer --public --source=. --remote=origin
git add . && git commit -m "Initial build" && git push -u origin main
npx vercel --yes
npx vercel --prod
vercel git connect
```

Set environment variables in the Vercel dashboard.

### Live URL

https://ai-budget-analyzer.vercel.app

## Plan Tiers

| Feature | Free | Plus ($5/mo) | Pro ($12/mo) |
|---------|------|--------------|--------------|
| Forecast horizon | 7 days | 30 days | 60 days |
| Bills & Income | 5 | 20 | Unlimited |
| CSV Import | Yes | Yes | Yes |
| Income gap warnings | No | Yes | Yes |
| Multiple plans | No | No | Yes |

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
