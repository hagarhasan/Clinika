# Clinika Backend

A robust RESTful API built with **Node.js, Express.js, and PostgreSQL**, powering a modern healthcare management platform.

Clinika provides a complete backend infrastructure for managing patients, doctors, appointments, authentication, notifications, and administrative operations through a secure and well-structured API.

## ✨ Features

- **Authentication & Authorization** – Secure JWT-based authentication with role-based access control.
- **User Management** – Support for administrators, doctors, and patients.
- **Doctor Management** – Manage doctor profiles, specialties, availability, and approval workflows.
- **Appointment Management** – Handle appointment scheduling, availability slots, booking, and cancellation.
- **Patient Management** – Manage patient profiles and related healthcare information.
- **Email Notifications** – Automated transactional emails using Resend.
- **Cloudinary Integration** – Image and media upload management.
- **Appointment Reminders** – Scheduled notifications for upcoming appointments.
- **API Documentation** – Interactive Swagger documentation.
- **Database Management** – PostgreSQL integration with safe, repeatable schema initialization.
- **Input Validation** – Request validation using Zod.
- **Automated Testing** – Unit tests and API smoke tests.

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript Runtime |
| Express.js | Backend Framework |
| PostgreSQL | Relational Database |
| pg | PostgreSQL Client |
| JWT | Authentication |
| bcrypt | Password Hashing |
| Zod | Request Validation |
| Resend | Email Delivery |
| Cloudinary | Media Storage |
| Swagger | API Documentation |
| Vercel | Deployment |

## 🔐 Authentication & Security

Clinika uses JWT-based authentication to secure API access.

Security features include:

- Password hashing with bcrypt.
- JWT access tokens.
- Role-based authorization.
- Token version validation.
- Protected routes and permission checks.
- Request body validation.
- Configurable CORS policies.
- Environment-based secret management.

### Supported User Roles

- **Admin** – Full administrative access and platform management.
- **Doctor** – Manage professional profiles and appointments.
- **Patient** – Manage personal information and appointments.

## 🗄 Database

Clinika uses PostgreSQL as its primary database, hosted on Neon.

The database handles:

- User accounts and authentication.
- Doctor profiles and specialties.
- Patient information.
- Appointment records.
- Availability and scheduling.
- Administrative operations.
- Related platform data.

Database schema initialization is handled through a dedicated migration script designed to safely create missing database structures.

## 📁 Project Structure

```text
clinika-backend/
│
├── api/
│   └── index.js
│
├── src/
│   ├── routes/
│   ├── services/
│   ├── app.js
│   ├── repo.js
│   └── schemas.js
│
├── db/
│   └── schema.sql
│
├── tests/
│
├── scripts/
│
├── .env.example
├── .gitignore
├── package.json
├── vercel.json
└── README.md
```

### Architecture Overview

- **api/** – Serverless entry point for Vercel.
- **src/routes/** – API route definitions and request handling.
- **src/services/** – Business logic, appointments, email delivery, notifications, and integrations.
- **src/app.js** – Express application configuration, middleware, routing, and error handling.
- **src/repo.js** – Database queries and data access operations.
- **src/schemas.js** – Request validation schemas.
- **db/** – Database schema definitions.
- **tests/** – Automated tests and testing utilities.

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- PostgreSQL database (Neon recommended)

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd clinika-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Configure the required environment variables:

```env
DATABASE_URL=
SECRET_KEY=

CORS_ORIGINS=
FRONTEND_URL=

CRON_SECRET=

RESEND_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Additional configuration options are available in `.env.example`.

### 4. Initialize the Database

```bash
npm run db:migrate
```

This command initializes the required database structures without deleting existing records.

### 5. Start the Development Server

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:8000
```

## 📚 API Documentation

Clinika provides interactive API documentation through Swagger UI.

Once the server is running, visit:

```text
http://localhost:8000/docs
```

The documentation provides an overview of available endpoints, request parameters, response structures, and API operations.

To regenerate the API specification:

```bash
npm run docs:build
```

## 🧪 Testing

The project includes automated tests for core application logic and API workflows.

### Run Unit Tests

```bash
npm test
```

### Run API Smoke Tests

Start the server in one terminal:

```bash
npm run dev
```

Then run:

```bash
npm run smoke
```

To test a deployed API:

```bash
BASE_URL=https://your-api-domain.vercel.app npm run smoke
```

## 🌐 Deployment

Clinika Backend is configured for deployment on Vercel.

### Deployment Steps

1. Import the repository into Vercel.
2. Configure the required environment variables.
3. Connect the PostgreSQL database through Neon.
4. Deploy the project.
5. Run the smoke tests against the deployed API.
6. Verify the API documentation and frontend integration.

The project includes a `vercel.json` configuration for deployment and scheduled appointment reminder tasks.

### Scheduled Tasks

Appointment reminders are handled through a scheduled Vercel Cron Job.

The reminder endpoint runs daily:

```text
/internal/send-reminders
```

Access is protected using the configured `CRON_SECRET`.

## 📧 Email Templates

Transactional emails are powered by Resend.

The backend supports configurable email templates for:

- Password reset.
- Patient invitations.
- Doctor approval.
- Doctor rejection.
- Appointment confirmation.

Custom Resend templates can be configured through environment variables. Built-in HTML templates are used as a fallback when custom templates are unavailable.

## 📌 API Capabilities

The backend provides **86 REST API endpoints** covering the platform's main operations, including:

- Authentication and account management.
- Doctor profiles and management.
- Patient management.
- Appointment scheduling and booking.
- Availability and time slots.
- Administrative operations.
- Notifications and reminders.

All endpoints follow consistent JSON response structures and centralized error handling.

## 🔒 Environment & Configuration

Sensitive credentials and application settings are managed through environment variables.

**Important:**
- Never commit `.env` files.
- Keep database credentials private.
- Use strong secrets for JWT signing.
- Configure allowed frontend origins.
- Protect internal scheduled-task endpoints.

## 📄 License

This project is currently maintained as a private project.

---

**Clinika Backend**  
*Secure. Scalable. Reliable Healthcare Infrastructure.*
