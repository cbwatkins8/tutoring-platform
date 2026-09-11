# Civil Tutoring Platform - Quick Start Guide

> **Historical guide:** use `THREAD_HANDOFF_CURRENT.md` and `README.md` for the
> current Take Two Tutoring MVP, port 3001, migrations, feature flags, security,
> deployment status, and verification commands.

## 🎯 What You Have

A **fully functional MVP** of your tutoring platform with:
- ✅ User signup (parent + student)
- ✅ Login with authentication
- ✅ Parent dashboard to book sessions
- ✅ Tutor dashboard to view bookings
- ✅ Complete responsive mobile design
- ✅ PostgreSQL database integration
- ✅ Secure password hashing

## 🚀 Start Here (5 Minutes)

### 1. Ensure PostgreSQL is Running
```bash
# Check if running
docker compose ps

# If not running, start it
docker compose up -d

# Verify
docker compose logs postgres
```

You should see "ready to accept connections"

### 2. Start Development Server
```bash
npm run dev
```

You should see:
```
> ready on http://localhost:3000
```

### 3. Test the App
Open in browser: `http://localhost:3000`

You should see:
- Navy navbar with "Civil Tutoring" logo
- White hero section with Teal/Orange colors
- Feature cards
- CTA buttons

## 👥 Create Test Accounts

### Parent Account
1. Click "Sign Up" or go to `http://localhost:3000/signup`
2. Enter parent info:
   - Name: John Smith
   - Email: john@example.com
   - Password: Password123!
3. Click "Next Step"
4. Enter student info:
   - Name: Emma Smith
   - Grade: 9
   - Subjects: Math, Science
5. Click "Create Account"

### Tutor Account (You)
Run this once:
```bash
npx ts-node scripts/setup-tutor.ts
```

This creates:
- Email: `tutor@civiltutoring.com`
- Password: `SecurePassword123!`
- Available: Mon-Fri, 3-8pm

**Important**: Change this password after first login!

## 📝 Test Workflow

### As Parent:
1. Go to `http://localhost:3000/login`
2. Login with parent email and password
3. You'll see the dashboard with your student
4. Click "Book a Session"
5. Select subject, date, time
6. Click "Book Session"
7. See the session appear in "Upcoming Sessions"

### As Tutor:
1. Go to `http://localhost:3000/login`
2. Login with `tutor@civiltutoring.com`
3. You'll see tutor dashboard
4. See all booked sessions
5. Click "Join Zoom" button (for testing, just shows the url)

## 🛠️ Database Checks

### See Your Data
```bash
psql postgresql://postgres:postgres@localhost:5432/tutoring_dev

# See users
\d users
SELECT * FROM users;

# See students
SELECT * FROM students;

# See sessions
SELECT * FROM sessions;
```

### Helpful Queries
```sql
-- See all sessions with student names
SELECT s.*, st.first_name, st.last_name 
FROM sessions s 
JOIN students st ON s.student_id = st.id;

-- See specific user
SELECT * FROM users WHERE email = 'john@example.com';

-- See all bookings
SELECT 
  st.first_name,
  st.last_name,
  s.subject,
  s.scheduled_at,
  s.status
FROM sessions s
JOIN students st ON s.student_id = st.id
ORDER BY s.scheduled_at DESC;
```

## 📱 Test Mobile Responsiveness

### In Browser:
1. Press `F12` to open DevTools
2. Click responsive design mode (or `Cmd+Shift+M`)
3. Select "iPhone SE" (375px width)
4. Test all pages:
   - Homepage ✅ no horizontal scroll
   - Signup ✅ form fits perfectly
   - Dashboard ✅ buttons are tappable
   - Booking ✅ easy to use

### On Real Phone:
1. Find your computer's IP address:
   ```bash
   ipconfig getifaddr en0  # Mac
   # or
   hostname -I  # Linux
   ```
2. Open on phone: `http://[your-ip]:3000`
3. Test signup, login, booking

## 🔑 Key Features to Test

✅ **Signup**
- Two-step form works
- Data saves to database
- Password is hashed (you can verify in DB)
- Redirects to dashboard

✅ **Login**
- Valid credentials work
- Invalid credentials show error
- Redirects based on role (parent → dashboard, tutor → tutor-dashboard)
- Token is stored in localStorage

✅ **Dashboard**
- Shows student info
- Shows upcoming sessions
- Shows session history
- Book a Session button works
- Profile button works
- Logout works

✅ **Booking**
- Pre-fills student name
- Can select subject
- Can pick date/time
- Appears in dashboard immediately
- Appears in tutor dashboard

✅ **Responsive Design**
- No horizontal scroll on mobile
- Touch-friendly buttons (44px+)
- Text is readable
- Proper spacing and padding

## ⚠️ Common Issues

### "Port 3000 already in use"
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Then restart
npm run dev
```

### Database connection error
```bash
# Make sure Docker is running
docker compose up -d

# Check status
docker compose ps
```

### Changes not showing
```bash
# Stop server (Ctrl+C)
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

### Git commit issues
```bash
# If commit fails, run this
bash COMMIT_CHANGES.sh
```

## 🚀 Next Steps

After testing locally, you can:

1. **Deploy to Vercel**
   - Connect your GitHub repo
   - Set DATABASE_URL environment variable
   - Deploy with one click

2. **Add Zoom Integration**
   - Get Zoom API credentials
   - Create meetings automatically
   - Generate join URLs

3. **Add Stripe Payments**
   - Accept session payments
   - Track billing
   - Refund management

4. **Add Email Notifications**
   - Booking confirmations
   - Session reminders
   - Session reports

## 📚 Reference Docs

- `MVP_STATUS.md` - Complete feature list and checklist
- `TESTING_GUIDE.md` - Detailed testing procedures
- `app/` - All page components
- `app/api/` - All API endpoints
- `lib/schema.sql` - Database schema

## 💡 Tips

- Use browser DevTools to see network requests
- Check Application tab to see stored token
- View database with: `psql postgresql://postgres:postgres@localhost:5432/tutoring_dev`
- All passwords are hashed with bcryptjs
- Change tutor password before going to production!

## 🎉 Success Indicators

You know the MVP is working when:
- ✅ Parent signs up successfully
- ✅ Parent logs in successfully
- ✅ Parent books a session
- ✅ Tutor logs in and sees the booking
- ✅ All pages are mobile-responsive
- ✅ No console errors

---

**You're ready to test!** 🚀

Start with: `npm run dev`

Then open: `http://localhost:3000`
