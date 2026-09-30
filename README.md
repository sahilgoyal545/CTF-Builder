# CTF-Builder

CTF-Builder is a web platform for creating and hosting Capture The Flag cybersecurity events.

## Project Structure

- `client-admin` - Organizer dashboard
- `client-participant` - Player interface
- `server` - Node.js/Express backend
- PostgreSQL - Main relational database
- Redis - Leaderboard and rate limiting
- Socket.io - Real-time scoreboard updates

## Features

### Organizer

- Admin authentication
- Create challenges
- Delete challenges
- Challenge categories
- Challenge points
- Flag management

### Player

- Player authentication
- View available challenges
- Submit flags
- Duplicate submission protection
- Score tracking
- Leaderboard

### Security

- JWT authentication
- Role-based admin access
- PostgreSQL parameterized queries
- Submission rate limiting support
- Duplicate challenge protection

## Demo Credentials

### Admin

Username:
`admin`

Password:
`Admin@123`

### Player

Username:
`player`

Password:
`Player@123`

## Database

PostgreSQL database:

`ctf_builder`

Tables:

- `events`
- `users`
- `challenges`
- `submissions`

## Running the Project

### Backend

```bash
cd server
npm install
node index.js