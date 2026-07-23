# BookSlot Backend Service

BookSlot is a simple appointment booking platform backend built with NestJS, Prisma, and PostgreSQL. Business owners can define their service catalog and schedules, while customers can browse slots and book appointments safely without race conditions.

---

## Technical Stack
* **Framework**: NestJS (TypeScript in Strict Mode)
* **ORM**: Prisma Client (v6.3.0)
* **Database**: PostgreSQL (v13+)
* **Authentication**: Passport.js + JWT (JSON Web Tokens)
* **Validation**: class-validator + class-transformer (DTO Validation)

---

## Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [PostgreSQL](https://www.postgresql.org/) (Running local instance)
* npm or another package manager

---

## Installation & Setup

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your database URI:
   ```bash
   cp .env.example .env
   ```
   Modify the `DATABASE_URL` and `JWT_SECRET` variables inside `.env` to match your local setup:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/bookslot?schema=public"
   JWT_SECRET="your-development-jwt-secret-key"
   PORT=3000
   ```

3. **Prisma Schema Generation**:
   Generate the Prisma Client types:
   ```bash
   npx prisma generate
   ```

4. **Run Database Migrations**:
   Run migrations to set up the tables, constraints, and indexes in your local PostgreSQL database:
   ```bash
   npx prisma migrate dev --name init
   ```

---

## Running the Application

### Development Mode (with hot-reload)
```bash
npm run start:dev
```
The server will start on [http://localhost:3000/api](http://localhost:3000/api).

### Production Mode
```bash
npm run build
npm run start:prod
```

---

## Running Tests

### Run Unit Tests
To execute unit tests (which include tests for the core slot selection and double-booking logic with mocked Prisma clients):
```bash
npm run test
```

---

## Architecture and Design Decisions
For a complete breakdown of:
* The Entity-Relationship diagram and Prisma database schema
* Concurrency and race-condition prevention (using database row locking)
* API endpoint specifications and access permissions
* Boundary conditions and validation rules

Please refer to the [DESIGN.md](DESIGN.md) document in the repository root.
