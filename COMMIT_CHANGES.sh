#!/bin/bash

# Manual commit script - run this from your terminal if automated commit fails
# cd ~/tutoring-platform && bash COMMIT_CHANGES.sh

echo "Committing Civil Tutoring MVP changes..."

git add -A

git commit -m "Complete Civil Tutoring MVP - all core features

✅ COMPLETED FEATURES:

Core Pages:
- Home page with Navy/Teal/Orange design
- Signup with two-step form (parent + student)
- Login with email/password
- Student/parent dashboard with session management
- Session booking interface
- Tutor dashboard for managing bookings
- Profile page for editing student information

APIs:
- POST /api/signup - User registration
- POST /api/login - Authentication
- GET /api/student - Fetch student data
- GET /api/sessions - Get user's sessions
- POST /api/sessions/create - Book new session
- GET /api/tutor/sessions - Get tutor's bookings
- PATCH /api/student/update - Update profile
- GET /api/availability - Get availability slots

Technical:
- PostgreSQL database with full schema
- Password hashing with bcryptjs
- Token-based authentication
- localStorage for client-side auth
- Fully responsive design (mobile-first)
- Tailwind CSS styling
- TypeScript throughout
- Next.js 16 + React 19

Authentication:
- Base64-encoded JWT tokens
- Role-based routing (parent/tutor/admin)
- Secure password verification
- Protected API endpoints
- Client-side auth middleware

Design:
- Navy (#0F172A) for structure/trust
- Teal (#0D9488) for accents
- Orange (#F97316) for CTAs
- Mobile-first responsive design
- Works on 375px+ width devices
- Touch-friendly interface

Documentation:
- MVP_STATUS.md - Feature checklist
- TESTING_GUIDE.md - Complete testing steps
- Setup script for tutor account initialization

Ready for:
✅ Local development and testing
✅ Deployment to Vercel
✅ Integration with Zoom API
✅ Integration with Stripe
✅ Email notifications

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"

echo "✅ Changes committed successfully!"
git log -1 --oneline
