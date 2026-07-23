# BookSlot API Testing Guide & Payloads

This document lists all API endpoints, request payloads (bodies), headers, query parameters, and example responses to help you test the APIs using Postman, Curl, or other REST clients.

All base URLs start with `http://localhost:3000/api`.

---

## 1. Authentication Endpoints

### Register Business Owner
* **Method**: `POST`
* **URL**: `/auth/business/register`
* **Body (JSON)**:
  ```json
  {
    "email": "owner@salon.com",
    "password": "securepassword123",
    "name": "Alice Green"
  }
  ```

### Login Business Owner
* **Method**: `POST`
* **URL**: `/auth/business/login`
* **Body (JSON)**:
  ```json
  {
    "email": "owner@salon.com",
    "password": "securepassword123"
  }
  ```
* **Success Response**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "a90f1245-c89b-4221...",
        "email": "owner@salon.com",
        "name": "Alice Green",
        "role": "BUSINESS_OWNER"
      }
    }
  }
  ```

### Register Customer
* **Method**: `POST`
* **URL**: `/auth/customer/register`
* **Body (JSON)**:
  ```json
  {
    "email": "customer@gmail.com",
    "password": "customerpassword",
    "name": "Bob Smith"
  }
  ```

### Login Customer
* **Method**: `POST`
* **URL**: `/auth/customer/login`
* **Body (JSON)**:
  ```json
  {
    "email": "customer@gmail.com",
    "password": "customerpassword"
  }
  ```
* **Success Response**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "user": {
        "id": "e44d32e9-411a-4d22...",
        "email": "customer@gmail.com",
        "name": "Bob Smith",
        "role": "CUSTOMER"
      }
    }
  }
  ```

### Get Authenticated User Profile
* **Method**: `GET`
* **URL**: `/auth/profile`
* **Headers**:
  * `Authorization: Bearer <accessToken>`
* **Success Response**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "id": "e44d32e9-411a-4d22...",
      "email": "customer@gmail.com",
      "name": "Bob Smith",
      "role": "CUSTOMER",
      "createdAt": "2026-07-22T06:21:00.000Z"
    }
  }
  ```

---

## 2. Services Management (Business Owners Only)

### Create Service
* **Method**: `POST`
* **URL**: `/services`
* **Headers**:
  * `Authorization: Bearer <ownerAccessToken>`
* **Body (JSON)**:
  ```json
  {
    "name": "Haircut & Wash",
    "duration": 40,
    "price": 45.00
  }
  ```

### Get My Services
* **Method**: `GET`
* **URL**: `/services/my`
* **Headers**:
  * `Authorization: Bearer <ownerAccessToken>`

### Update Service
* **Method**: `PUT`
* **URL**: `/services/:id` (Replace `:id` with service UUID)
* **Headers**:
  * `Authorization: Bearer <ownerAccessToken>`
* **Body (JSON)**:
  ```json
  {
    "name": "Haircut, Wash & Styling",
    "price": 50.00
  }
  ```

### Delete Service (Soft Delete)
* **Method**: `DELETE`
* **URL**: `/services/:id` (Replace `:id` with service UUID)
* **Headers**:
  * `Authorization: Bearer <ownerAccessToken>`

---

## 3. Availability Management (Business Owners Only)

### Save Weekly Availability (Supports Split Shifts)
* **Method**: `POST`
* **URL**: `/availability`
* **Headers**:
  * `Authorization: Bearer <ownerAccessToken>`
* **Body (JSON)**:
  ```json
  {
    "availabilities": [
      {
        "dayOfWeek": "MONDAY",
        "startTime": "11:00",
        "endTime": "14:00"
      },
      {
        "dayOfWeek": "MONDAY",
        "startTime": "16:00",
        "endTime": "20:00"
      },
      {
        "dayOfWeek": "WEDNESDAY",
        "startTime": "09:00",
        "endTime": "17:00"
      }
    ]
  }
  ```

### Get My Weekly Availability
* **Method**: `GET`
* **URL**: `/availability/my`
* **Headers**:
  * `Authorization: Bearer <ownerAccessToken>`

### Set Availability Override for Specific Date (Holiday/Sick Leave or Custom Shift)
* **Method**: `POST`
* **URL**: `/availability/overrides`
* **Headers**:
  * `Authorization: Bearer <ownerAccessToken>`
* **Body (JSON - Marking Closed/Unavailable)**:
  ```json
  {
    "date": "2026-07-22",
    "isUnavailable": true
  }
  ```
* **Body (JSON - Custom shift / specific hours override)**:
  ```json
  {
    "date": "2026-07-29",
    "isUnavailable": false,
    "slots": [
      {
        "startTime": "11:00",
        "endTime": "14:00"
      }
    ]
  }
  ```

### Get My Availability Overrides
* **Method**: `GET`
* **URL**: `/availability/overrides`
* **Headers**:
  * `Authorization: Bearer <ownerAccessToken>`

---

## 4. Public / Browsing Endpoints (Open to All)

### Browse All Available Services
* **Method**: `GET`
* **URL**: `/services`

### Get Available Booking Slots
* **Method**: `GET`
* **URL**: `/services/:id/slots?date=YYYY-MM-DD`
* **Query Parameters**:
  * `date`: Specify date in `YYYY-MM-DD` format (e.g. `2026-07-27`)
* **Success Response**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "startTime": "2026-07-27T11:00:00.000Z",
        "endTime": "2026-07-27T11:40:00.000Z",
        "available": true,
        "reason": null
      },
      {
        "startTime": "2026-07-27T11:30:00.000Z",
        "endTime": "2026-07-27T12:10:00.000Z",
        "available": false,
        "reason": "booked"
      },
      {
        "startTime": "2026-07-27T13:30:00.000Z",
        "endTime": "2026-07-27T14:10:00.000Z",
        "available": false,
        "reason": "boundary_exceeded"
      }
    ]
  }
  ```

---

## 5. Booking Endpoints

### Create Booking
* **Method**: `POST`  
* **URL**: `/bookings`
* **Headers**:
  * `Authorization: Bearer <customerAccessToken>`
* **Body (JSON)**:
  ```json
  {
    "serviceId": "a78ef45b-c211...",
    "date": "2026-07-27",
    "time": "11:00"
  }
  ```

### Get My Bookings (As Customer)
* **Method**: `GET`
* **URL**: `/bookings/my`
* **Headers**:
  * `Authorization: Bearer <customerAccessToken>`

### Cancel Booking (As Customer)
* **Method**: `POST`  
* **URL**: `/bookings/:id/cancel` (Replace `:id` with booking UUID)
* **Headers**:
  * `Authorization: Bearer <customerAccessToken>`

### Get Bookings (As Business Owner)
* **Method**: `GET`
* **URL**: `/bookings/owner`
* **Headers**:
  * `Authorization: Bearer <ownerAccessToken>`

### Update Booking Status (As Business Owner)
* **Method**: `PATCH`
* **URL**: `/bookings/:id/status` (Replace `:id` with booking UUID)
* **Headers**:
  * `Authorization: Bearer <ownerAccessToken>`
* **Body (JSON)**:
  ```json
  {
    "status": "COMPLETED"
  }
  ```
  *(Options are: `"COMPLETED"` or `"NO_SHOW"`)*
