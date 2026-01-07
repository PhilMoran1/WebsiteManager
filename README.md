# Website Manager Dashboard

A centralized dashboard to track performance and revenue across hundreds of websites. Built with React, Node.js, and PostgreSQL.

## Features

- **Site Management**: Add, edit, and manage all your websites in one place
- **Revenue Tracking**: Monitor earnings from AdSense and other ad networks
- **Analytics**: Track pageviews, sessions, and unique visitors
- **Alerts**: Get notified when revenue drops or traffic changes significantly
- **Lightweight Tracking**: ~1KB tracking script with minimal performance impact

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Your Sites    │────▶│ Tracking Script │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
┌─────────────────┐     ┌─────────────────┐
│  React Frontend │◀───▶│  Node.js API    │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │PostgreSQL│ │  Redis   │ │ AdSense  │
              │    DB    │ │  Queue   │ │   API    │
              └──────────┘ └──────────┘ └──────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL and Redis)
- npm or yarn

### 1. Start the Database

```bash
docker-compose up -d
```

### 2. Set Up the Backend

```bash
cd server
npm install
cp .env.example .env  # Edit with your settings
npm run db:migrate
npm run dev
```

### 3. Set Up the Frontend

```bash
cd client
npm install
npm run dev
```

### 4. Open the Dashboard

Visit [http://localhost:3000](http://localhost:3000)

## Configuration

### Environment Variables

Create a `.env` file in the `server` directory:

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/website_manager

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
NODE_ENV=development
TRACKER_ENDPOINT=http://localhost:3001

# Google AdSense API (optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token
ADSENSE_ACCOUNT_ID=your_account_id
```

### Setting Up Google AdSense API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the AdSense Management API
4. Create OAuth 2.0 credentials
5. Get a refresh token using the OAuth playground
6. Add your credentials to `.env`

## Adding Tracking to Your Sites

After adding a site to the dashboard, you'll get a tracking code like:

```html
<!-- Website Manager Tracking -->
<script src="http://your-server.com/tracker.js?siteId=wm_abc123def456" async></script>
```

Add this to the `<head>` section of your website.

### Custom Event Tracking

You can track custom events using the global `wm` function:

```javascript
// Track a button click
wm('button_click', { button: 'signup' });

// Track a game event
wm('game_score', { level: 5, score: 1500 });

// Track a purchase
wm('purchase', { product: 'premium', amount: 9.99 });
```

## API Endpoints

### Sites

- `GET /api/sites` - List all sites
- `GET /api/sites/:id` - Get site details
- `POST /api/sites` - Create a new site
- `PUT /api/sites/:id` - Update a site
- `DELETE /api/sites/:id` - Delete a site
- `GET /api/sites/:id/tracking-code` - Get tracking code
- `GET /api/sites/:id/stats` - Get site statistics

### Revenue

- `GET /api/revenue/overview` - Revenue overview
- `GET /api/revenue/site/:id` - Site revenue
- `POST /api/revenue` - Add manual revenue entry
- `GET /api/revenue/comparison` - Period comparison

### Alerts

- `GET /api/alerts` - List alerts
- `PUT /api/alerts/:id/resolve` - Resolve an alert
- `GET /api/alerts/rules` - List alert rules
- `POST /api/alerts/rules` - Create alert rule
- `DELETE /api/alerts/rules/:id` - Delete alert rule

### Tracking

- `POST /api/tracking/event` - Record tracking event
- `GET /api/tracking/events/:siteId` - Get events (debugging)
- `GET /api/tracking/realtime/:siteId` - Realtime stats

## Project Structure

```
WebsiteManager/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Dashboard, Sites, Revenue, Alerts
│   │   ├── hooks/          # Custom React hooks
│   │   └── api/            # API client
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── config/         # Database and Redis config
│   │   ├── jobs/           # Scheduled tasks
│   │   └── db/             # Migrations
│   └── package.json
├── tracker/                # Embeddable tracking script
│   └── tracker.js
├── docker-compose.yml      # PostgreSQL + Redis
└── README.md
```

## Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Recharts, React Router
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7, Bull
- **Build Tools**: Vite, tsx

## Scheduled Jobs

The server runs several scheduled jobs:

- **Revenue Sync** (6:00 AM daily): Pulls revenue data from AdSense API
- **Alert Check** (Every hour): Evaluates alert rules and creates alerts
- **Stats Aggregation** (12:05 AM daily): Calculates bounce rates and session durations

## License

MIT
