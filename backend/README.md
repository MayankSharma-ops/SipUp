# SipUp Backend

This backend exposes a small auth and profile API for the Expo app.

## Stack

- Neon PostgreSQL
- Express
- Nodemailer

## Endpoints

- `GET /api/health`
- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `PUT /api/me/profile`

## Auth flow

- Sign up: request OTP, verify the OTP, and set a password.
- Log in: submit email and password directly. OTP is not used for login.

## Environment

Use two env files:

- Root `.env` for Expo public variables only
- `backend/.env` for Neon, SMTP, OTP, and session secrets

Examples:

- Root public example: `../.env.example`
- Backend secret example: `./.env.example`

## Run

```bash
npm install
npm run server
```
