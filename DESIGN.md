# DESIGN.md - BookSlot Appointment Booking Platform Design Document

This design document outlines the system architecture, database schema, API design, authentication mechanism, edge cases, and assumptions made during the design of **BookSlot**.

---

## 1. Database Schema Design

We use PostgreSQL as our database and Prisma as our ORM. Below is the Entity-Relationship schema:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum BookingStatus {
  CONFIRMED
  COMPLETED
  NO_SHOW
  CANCELLED
}

enum DayOfWeek {
  SUNDAY
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
}

model BusinessOwner {
  id             String         @id @default(uuid())
  email          String         @unique
  passwordHash   String
  name           String
  services       Service[]      @relation("OwnerServices")
  availabilities Availability[] @relation("OwnerAvailabilities")
  bookings       Booking[]      @relation("OwnerBookings")
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@map("business_owners")
  @@index([email])
}

model Customer {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  name         String
  bookings     Booking[] @relation("CustomerBookings")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@map("customers")
  @@index([email])
}

model Service {
  id        String        @id @default(uuid())
  ownerId   String
  owner     BusinessOwner @relation("OwnerServices", fields: [ownerId], references: [id], onDelete: Restrict)
  name      String
  duration  Int           // In minutes
  price     Decimal       @db.Decimal(10, 2)
  isDeleted Boolean       @default(false) // Soft deletion support
  bookings  Booking[]
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@map("services")
  @@index([ownerId])
}

model Availability {
  id        String        @id @default(uuid())
  ownerId   String
  owner     BusinessOwner @relation("OwnerAvailabilities", fields: [ownerId], references: [id], onDelete: Cascade)
  dayOfWeek DayOfWeek
  startTime String        // "HH:mm" format (e.g. "09:00")
  endTime   String        // "HH:mm" format (e.g. "17:00")
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@unique([ownerId, dayOfWeek, startTime, endTime])
  @@map("availabilities")
  @@index([ownerId, dayOfWeek])
}

model Booking {
  id         String        @id @default(uuid())
  customerId String
  customer   Customer      @relation("CustomerBookings", fields: [customerId], references: [id], onDelete: Restrict)
  ownerId    String
  owner      BusinessOwner @relation("OwnerBookings", fields: [ownerId], references: [id], onDelete: Restrict)
  serviceId  String
  service    Service       @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  startTime  DateTime      // UTC start time
  endTime    DateTime      // UTC end time (startTime + service.duration)
  status     BookingStatus @default(CONFIRMED)
  createdAt  DateTime      @default(now())
  updatedAt  DateTime      @updatedAt

  @@map("bookings")
  @@index([ownerId, startTime])
  @@index([customerId])
  @@index([serviceId])
}
```

### Schema Rationale & Structural Decisions
1. **Separate Tables for Owners and Customers**: Storing business owners and customers in separate tables matches the product brief's mandate ("Customers can register and log in separately from business owners"). This structure keeps user profiles clean, avoids mixing customer-specific fields with business metadata, and prevents account cross-contamination.
2. **Financial Decimal Type (`Decimal(10, 2)`)**: Storing prices as `Decimal` instead of floating-point numbers prevents rounding discrepancies inherent in float types, ensuring precision for transactions and financial reporting.
3. **No Cascade Delete for Service & Bookings**: A booking must remain visible in database records even if a service or user is modified. We enforce `onDelete: Restrict` on the Service relation to prevent deletion of a service with active bookings, relying on soft-deletion (`isDeleted = true`) instead.
4. **Calculated `endTime` in Bookings**: Storing the booking end time directly in the DB allows indexing on `(ownerId, startTime)` and simplifies range checks for overlapping bookings (e.g. `start_a < end_b AND end_a > start_b`) without joining tables.
5. **Database Indexes**: Added indexes on `email` (login lookup), `ownerId` (availability/service queries), and `(ownerId, startTime)` (booking search) to optimize query latency under high volume.

---

## 2. API Surface

All routes start with the prefix `/api`.

| Route | Method | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/business/register` | `POST` | Public | Registers a new Business Owner. |
| `/api/auth/business/login` | `POST` | Public | Authenticates Business Owner, returns JWT token. |
| `/api/auth/customer/register` | `POST` | Public | Registers a new Customer. |
| `/api/auth/customer/login` | `POST` | Public | Authenticates Customer, returns JWT token. |
| `/api/auth/profile` | `GET` | Authenticated | Retrieves current logged-in user profile. |
| `/api/services` | `GET` | Public | Lists all active services on the platform (includes owner info). |
| `/api/services/:id` | `GET` | Public | Retrieves specific service details. |
| `/api/services/:id/slots` | `GET` | Public | Lists generated time slots for a service on a given `?date=YYYY-MM-DD`. |
| `/api/services` | `POST` | Owner | Creates a service offering (name, duration, price). |
| `/api/services/my` | `GET` | Owner | Lists all services created by the authenticated owner. |
| `/api/services/:id` | `PUT` | Owner | Updates service attributes (checks ownership). |
| `/api/services/:id` | `DELETE` | Owner | Soft-deletes a service offering (retains historical bookings). |
| `/api/availability` | `POST` | Owner | Defines weekly availability windows (accepts split shifts). |
| `/api/availability/my` | `GET` | Owner | Lists weekly availability configurations for the owner. |
| `/api/bookings` | `POST` | Customer | Books an appointment slot (duration auto-calculated). |
| `/api/bookings/my` | `GET` | Customer | Lists all bookings for the authenticated customer. |
| `/api/bookings/:id/cancel` | `POST` | Customer | Cancels an upcoming appointment (checks ownership). |
| `/api/bookings/owner` | `GET` | Owner | Lists all bookings for services offered by the owner. |
| `/api/bookings/:id/status` | `PATCH` | Owner | Marks a booking as `COMPLETED` or `NO_SHOW` (checks ownership). |

---

## 3. Authentication & Authorization Design

- **JWT Separation**:
  - The JWT payload contains `sub` (ID), `email`, and `role` (either `'BUSINESS_OWNER'` or `'CUSTOMER'`).
  - When validating the token in `JwtStrategy`, we load the user details from the correct table using the `role` field.
- **Access Guarding**:
  - `JwtAuthGuard` ensures requests are authenticated.
  - `RolesGuard` compares the metadata set by the custom `@Roles(...)` decorator with the `role` parsed from the client's JWT payload.
  - If a customer attempts to access owner-only routes (e.g. `POST /api/services`), they receive a `403 Forbidden` error.

---

## 4. Edge Cases & Concurrency Handling

### Concurrency and Double-Booking
1. **Double-Booking (Race Conditions)**:
   * *Problem*: Two customers check availability at 10:00 AM, see it is open, and simultaneously send a booking request. Both checks succeed concurrently, creating two overlapping bookings.
   * *Solution*: Booking creation is wrapped in a NestJS Prisma transaction. At the beginning of the transaction, we acquire a row lock on the Business Owner record:
     ```sql
     SELECT 1 FROM business_owners WHERE id = $1 FOR UPDATE;
     ```
     This forces concurrent booking requests for the same business owner to block and execute sequentially. The second request will wait until the first commits, at which point the overlapping check will find the first customer's booking and fail with `409 Conflict`.
2. **State-Transition Conflicts**:
   * *Problem*: A customer cancels a booking while an owner marks it complete.
   * *Solution*: The cancel and status update operations lock the booking row (`SELECT * FROM bookings WHERE id = $1 FOR UPDATE`). We verify the status is currently `CONFIRMED` before allowing any state changes.

### Business Rules & Validations
1. **Booking Outside Availability**: We check if the requested time range `[startTime, endTime]` fits completely within one of the owner's availability windows for that day of the week. If not, it returns `400 Bad Request`.
2. **30-Minute Interval Alignment**: Slots are generated starting from the window `startTime` and incrementing by 30-minute steps. When booking, we verify `(bookingStartMin - windowStartMin) % 30 == 0` to ensure alignment with standard slot configurations.
3. **Boundary Checking**: If an availability window is 11:00-14:00 and a service is 40 minutes, the slot starting at 13:30 ends at 14:10, which exceeds the availability limit. The slot generator detects this boundary mismatch and excludes the 13:30 slot.
4. **Booking in the Past**: Validates that `startTime` is greater than the current system time in UTC. Returns `400 Bad Request` if otherwise.
5. **Ownership Isolation**: Owners can only manage bookings/services that they own. Any attempt to update someone else's service yields `403 Forbidden` or `404 Not Found`.

---

## 5. Architectural Assumptions

- **Timezones**: All dates and times are stored and evaluated in UTC.
- **Weekly Schedule**: Availability settings represent a recurring weekly schedule. If a business owner is available Mondays 9:00-17:00, they are available on *every* Monday unless a booking already exists.
- **Single Resource Provider**: A business owner represents a single service provider (e.g. one specialist, stylist, or clinic room). Therefore, the owner cannot be double-booked across *any* of the services they offer. An active booking blocks that time slot for all services offered by that owner.
