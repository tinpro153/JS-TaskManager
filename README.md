<<<<<<< HEAD
# JS Task Manager

A full-stack Task Management System web application with user authentication, task CRUD, and deployment-ready setup.

## Features

- User registration, login, and logout
- Password hashing with bcrypt
- JWT-based authentication for securing API endpoints
- MongoDB with Mongoose for data storage
- Full CRUD for tasks
- Task classification by status: Pending, In Progress, Completed
- Security best practices: Helmet, CORS
- Config via dotenv
- Docker and Heroku deployment instructions

## Tech Stack

- Node.js + Express
- MongoDB (Mongoose)
- bcrypt for password hashing
- jsonwebtoken for JWTs
- Helmet and CORS for security
- dotenv for configuration
- Docker (optional)
- Heroku (optional deployment)

## Project Structure

```
server.js
router/
  verifyUser.js
package.json
README.md
```

## Environment Variables

Create a `.env` file in the project root with the following variables:

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/taskmanager
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d
NODE_ENV=development
```

Adjust `MONGODB_URI` for your environment (Atlas connection string or local MongoDB).

## Local Setup (Windows PowerShell)

1. Install dependencies:

```powershell
npm install
```

2. Create a `.env` file (see Environment Variables above).

3. Start the server (development):

```powershell
npm run dev # or: node server.js
```

The API will be available at `http://localhost:3000` (or the port you set).

## API Endpoints

The project provides the following API endpoints (adjust base URL/port as needed):

Authentication:

- POST /auth/register
  - Body: { "username": "user", "email": "email@example.com", "password": "pass" }
  - Response: created user info (without password)

- POST /auth/login
  - Body: { "email": "email@example.com", "password": "pass" }
  - Response: { "token": "<jwt>" }

- POST /auth/logout
  - Invalidate token on client side (server may implement token blacklist)

Tasks (require Authorization: Bearer <token>):

- GET /tasks
  - List tasks for the logged-in user

- POST /tasks
  - Create a new task
  - Body: { "title": "Task title", "description": "...", "status": "Pending" }

- GET /tasks/:id
  - Get a single task by id

- PUT /tasks/:id
  - Update a task

- DELETE /tasks/:id
  - Delete a task

Status values: `Pending`, `In Progress`, `Completed`.

## Security Notes

- Passwords are hashed with bcrypt before storing.
- JWTs are used for stateless session management. Keep `JWT_SECRET` secure.
- Helmet sets secure HTTP headers.
- CORS is enabled; configure allowed origins in your server code.

## Docker

Build and run with Docker:

```powershell
# Build image
docker build -t js-task-manager .

# Run (example, using local MongoDB or set MONGODB_URI to an Atlas URI)
docker run -d -p 3000:3000 --env-file .env --name js-task-manager js-task-manager
```

Dockerfile suggestions (if missing):

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "server.js"]

## Heroku Deployment

1. Create a Heroku app
2. Set config vars on Heroku (`MONGODB_URI`, `JWT_SECRET`, etc.)
3. Deploy via Git or GitHub integration

Procfile suggestion:

web: node server.js

## Testing

Add tests with your preferred test runner (Jest, Mocha). Example test ideas:

- Auth: register, login, protected routes
- Tasks: create, read, update, delete, status transitions

## Troubleshooting

- "EADDRINUSE": another process is using the port. Change `PORT` or stop the other process.
- MongoDB connection errors: verify `MONGODB_URI` and network access (Atlas IP whitelist).
- JWT auth errors: ensure `Authorization` header is `Bearer <token>`.

## Next Steps

- Implement token blacklisting for logout (optional)
- Add role-based access control (admin/users)
- Frontend UI (React/Vue) to consume the API

## License

MIT
=======
A full-stack Task Management System web application featuring robust user authentication (Register/Login/Logout) using bcrypt for password hashing and JWT for session security. The system utilizes MongoDB/Mongoose for data management and provides full CRUD functionality for tasks, allowing classification by status (Pending, In Progress, Completed). Security is enhanced via Helmet/CORS and configuration managed by dotenv. Deployment target is Heroku/Docker.
>>>>>>> 0596063e3fe10daa6f86cbe4274928dc2cbc7b32
