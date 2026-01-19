# @hololand/backend

**The API server for Hololand - handles users, worlds, and payments.**

## What It Does

- 🔐 **User accounts** - Sign up, log in, manage profiles
- 🌍 **World storage** - Save and load VR worlds
- 💰 **Payments** - Stripe integration for creator earnings
- 📊 **Analytics** - Track visits, engagement, revenue

## Quick Start

```bash
# Install
npm install @hololand/backend

# Run locally
npm run dev

# The API will be at http://localhost:3000
```

## API Endpoints

| Endpoint | What It Does |
|----------|--------------|
| `POST /auth/signup` | Create new account |
| `POST /auth/login` | Log in, get token |
| `GET /worlds` | List all your worlds |
| `POST /worlds` | Create a new world |
| `GET /worlds/:id` | Load a specific world |
| `PUT /worlds/:id` | Save changes to a world |
| `POST /payments/checkout` | Start a purchase |
| `GET /analytics/dashboard` | View your stats |

## Environment Variables

```bash
# .env file
DATABASE_URL=postgres://...
STRIPE_SECRET_KEY=sk_test_...
JWT_SECRET=your-secret-key
```

## For Developers

The backend is built with:
- **Next.js API routes** - Serverless-ready
- **Prisma** - Database ORM
- **Supabase** - Postgres + Auth
- **Stripe** - Payments

## Related Packages

- [@hololand/frontend](../frontend) - The web app UI
- [@hololand/auth](../auth) - Authentication helpers
- [@hololand/commerce](../commerce) - Shop & marketplace logic

## License

MIT
