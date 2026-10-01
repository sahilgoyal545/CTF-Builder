# CTF-Builder

CTF-Builder is a web platform for creating and hosting Capture The Flag cybersecurity events.

## Project Structure

- `client-admin` - Organizer dashboard
- `client-participant` - Player interface
- `server` - Node.js/Express backend
- PostgreSQL - Main relational database
- Redis - Optional leaderboard/rate-limit acceleration
- Socket.io - Real-time scoreboard updates

## Demo Credentials

Admin:
- Username: `admin`
- Password: `Admin@123`

Player:
- Username: `player`
- Password: `Player@123`

## Local Development

### Backend
```bash
cd server
npm install
node index.js
```

### Admin
```bash
cd client-admin
npm install
npm run dev
```

### Participant
```bash
cd client-participant
npm install
npm run dev
```

For deployed frontends, set `VITE_API_URL` to the public backend URL.

## Deployment

The backend is suitable for a Node.js Web Service. The two React applications can be deployed as separate static sites. Configure the backend PostgreSQL and JWT environment variables in the hosting provider and set `VITE_API_URL` on both frontends.
