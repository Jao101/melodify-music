# 🎵 Melodify Music - Subscription Management App

A modern music streaming app with **clean Stripe subscription integration** built with React, TypeScript, and Supabase.

## ✅ Clean Implementation Status

This project features a **production-ready, clean Stripe integration** that has been migrated from complex wrapper setups to a simple, maintainable architecture.

### 🏗️ Architecture
- **Frontend**: React + TypeScript + Shadcn/UI
- **Backend**: Supabase (Database + Auth + Edge Functions)
- **Payments**: Clean Stripe integration via edge functions
- **Deployment**: Fully configured for production

### 🔧 Stripe Integration Features
- ✅ Secure checkout session creation
- ✅ Automated webhook processing
- ✅ Subscription lifecycle management
- ✅ Multiple plan tiers (Premium, Family)
- ✅ Monthly/yearly billing cycles

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- Supabase CLI
- Stripe account (test mode for development)

### Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository>
   cd melodify-music
   npm install
   ```

2. **Configure environment**
   ```bash
   # Copy environment template
   cp supabase/.env.local.example supabase/.env.local
   
   # Update with your Stripe test keys and price IDs
   # See STRIPE_CLEAN_IMPLEMENTATION.md for details
   ```

3. **Start Supabase locally**
   ```bash
   supabase start
   ```

4. **Deploy edge functions**
   ```bash
   supabase functions deploy stripe-checkout
   supabase functions deploy stripe-webhook
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── subscription/   # Subscription management
│   └── ui/            # Reusable UI components
├── contexts/           # React contexts (AuthContext)
├── services/           # API services (stripeService.ts)
├── pages/             # Application pages
└── lib/               # Utilities

supabase/
├── functions/          # Edge functions
│   ├── stripe-checkout/  # Checkout session creation
│   └── stripe-webhook/   # Webhook processing
├── migrations/         # Database migrations
└── .env.local         # Local environment variables
```

## 💳 Stripe Integration

### Clean Architecture
```
Frontend → stripeService.ts → stripe-checkout → Stripe API
                                     ↓
Database ← stripe-webhook ← Stripe Webhooks
```

### Features Implemented
- **Subscription Plans**: Premium and Family tiers
- **Billing Cycles**: Monthly and yearly options
- **Automatic Sync**: Webhooks update user profiles
- **Security**: All secrets secured in Supabase

### Testing Subscription Flow
1. Navigate to `/` and click "Upgrade Plan"
2. Select a subscription tier
3. Complete checkout with test card: `4242 4242 4242 4242`
4. Verify profile updates in database

## 🔐 Environment Configuration

### Development (Local)
Required in `supabase/.env.local`:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
STRIPE_PREMIUM_YEARLY_PRICE_ID=price_...
STRIPE_FAMILY_MONTHLY_PRICE_ID=price_...
STRIPE_FAMILY_YEARLY_PRICE_ID=price_...
```

### Production
Set secrets via Supabase CLI:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
# ... other secrets
```

## 🧪 Testing

### Run Test Suite
```bash
# Test clean implementation
./test-clean-stripe.sh

# Build verification
npm run build

# Type checking
npm run type-check
```

### Manual Testing
1. User registration/login
2. Subscription plan selection
3. Stripe checkout completion
4. Webhook processing verification
5. Subscription management

## 📚 Documentation

- **[STRIPE_CLEAN_IMPLEMENTATION.md](./STRIPE_CLEAN_IMPLEMENTATION.md)** - Complete implementation guide
- **[MIGRATION_COMPLETE.md](./MIGRATION_COMPLETE.md)** - Migration summary
- **[STRIPE_SETUP.md](./STRIPE_SETUP.md)** - Original setup documentation

## 🚀 Production Deployment

### 1. Configure Stripe Webhooks
Set endpoint in Stripe Dashboard:
```
https://your-project.supabase.co/functions/v1/stripe-webhook
```

Enable events:
- `checkout.session.completed`
- `customer.subscription.*`

### 2. Update Environment
```bash
# Update to live Stripe keys
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Update price IDs to production prices
```

### 3. Deploy Application
```bash
# Build for production
npm run build

# Deploy edge functions
supabase functions deploy

# Deploy frontend (e.g., Vercel, Netlify)
```

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Shadcn/UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Functions)
- **Payments**: Stripe Checkout + Webhooks
- **State Management**: React Context + Tanstack Query
- **Build Tool**: Vite
- **Package Manager**: npm (Bun compatible)

## 📄 License

[MIT License](./LICENSE)

---

## 🎉 Features Highlights

- ✅ **Clean codebase** - No complex dependencies or wrapper layers
- ✅ **Security first** - All secrets secured, proper authentication
- ✅ **Production ready** - Comprehensive error handling and monitoring
- ✅ **Maintainable** - Simple architecture, well documented
- ✅ **Scalable** - Event-driven, stateless functions

**Ready for production! 🚀**
  
  ```sh
  brew install supabase/tap/supabase-beta
  brew link --overwrite supabase-beta
  ```
  
  To upgrade:

  ```sh
  brew upgrade supabase
  ```
</details>

<details>
  <summary><b>Windows</b></summary>

  Available via [Scoop](https://scoop.sh). To install:

  ```powershell
  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
  scoop install supabase
  ```

  To upgrade:

  ```powershell
  scoop update supabase
  ```
</details>

<details>
  <summary><b>Linux</b></summary>

  Available via [Homebrew](https://brew.sh) and Linux packages.

  #### via Homebrew

  To install:

  ```sh
  brew install supabase/tap/supabase
  ```

  To upgrade:

  ```sh
  brew upgrade supabase
  ```

  #### via Linux packages

  Linux packages are provided in [Releases](https://github.com/supabase/cli/releases). To install, download the `.apk`/`.deb`/`.rpm`/`.pkg.tar.zst` file depending on your package manager and run the respective commands.

  ```sh
  sudo apk add --allow-untrusted <...>.apk
  ```

  ```sh
  sudo dpkg -i <...>.deb
  ```

  ```sh
  sudo rpm -i <...>.rpm
  ```

  ```sh
  sudo pacman -U <...>.pkg.tar.zst
  ```
</details>

<details>
  <summary><b>Other Platforms</b></summary>

  You can also install the CLI via [go modules](https://go.dev/ref/mod#go-install) without the help of package managers.

  ```sh
  go install github.com/supabase/cli@latest
  ```

  Add a symlink to the binary in `$PATH` for easier access:

  ```sh
  ln -s "$(go env GOPATH)/cli" /usr/bin/supabase
  ```

  This works on other non-standard Linux distros.
</details>

<details>
  <summary><b>Community Maintained Packages</b></summary>

  Available via [pkgx](https://pkgx.sh/). Package script [here](https://github.com/pkgxdev/pantry/blob/main/projects/supabase.com/cli/package.yml).
  To install in your working directory:

  ```bash
  pkgx install supabase
  ```

  Available via [Nixpkgs](https://nixos.org/). Package script [here](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/tools/supabase-cli/default.nix).
</details>

### Run the CLI

```bash
supabase bootstrap
```

Or using npx:

```bash
npx supabase bootstrap
```

The bootstrap command will guide you through the process of setting up a Supabase project using one of the [starter](https://github.com/supabase-community/supabase-samples/blob/main/samples.json) templates.

## Docs

Command & config reference can be found [here](https://supabase.com/docs/reference/cli/about).

## Breaking changes

We follow semantic versioning for changes that directly impact CLI commands, flags, and configurations.

However, due to dependencies on other service images, we cannot guarantee that schema migrations, seed.sql, and generated types will always work for the same CLI major version. If you need such guarantees, we encourage you to pin a specific version of CLI in package.json.

## Developing

To run from source:

```sh
# Go >= 1.22
go run . help
```
