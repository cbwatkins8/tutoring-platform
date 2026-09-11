# Testing Guide for Civil Tutoring Platform

> **Historical manual checklist:** the current automated command is
> `npm run test:e2e`; see `THREAD_HANDOFF_CURRENT.md` and `README.md` for port
> 3001, feature flags, the current public MVP, and the full verification sequence.

## Quick Test Checklist

### 1. Homepage
- [ ] Visit `http://localhost:3000`
- [ ] Check Navy navbar loads correctly
- [ ] Check Teal/Orange color scheme
- [ ] Test responsive design (resize browser to mobile)
- [ ] Click "Get Started" button → goes to `/signup`

### 2. Signup Flow
- [ ] Visit `/signup`
- [ ] Fill in parent name: "John Smith"
- [ ] Fill in email: "john@example.com"
- [ ] Fill in password: "Password123!"
- [ ] Click "Next Step"
- [ ] Fill in student name: "Emma Smith"
- [ ] Select grade: "9"
- [ ] Select subjects: "Math", "Science"
- [ ] Click "Create Account"
- [ ] Should see success message
- [ ] Should redirect to `/dashboard`

### 3. Database Verification
After signup, verify data in PostgreSQL:
```bash
psql postgresql://postgres:postgres@localhost:5432/tutoring_dev

# Check parent user was created:
SELECT * FROM users WHERE email = 'john@example.com';

# Check student was created:
SELECT * FROM students WHERE first_name = 'Emma';

# Check relationship:
SELECT * FROM student_guardians;
```

### 4. Login Flow
- [ ] Visit `/login`
- [ ] Enter email: "john@example.com"
- [ ] Enter password: "Password123!"
- [ ] Click "Sign In"
- [ ] Should redirect to `/dashboard`
- [ ] Should see "Welcome back, Emma!" message

### 5. Dashboard Features
- [ ] See student info displayed correctly
- [ ] See "Book a Session" button
- [ ] See "My Profile" button
- [ ] See "Upcoming Sessions" section (should be empty initially)
- [ ] See "Session History" section (should be empty initially)
- [ ] Click "Logout" button → redirect to home

### 6. Profile Page
- [ ] Visit `/profile`
- [ ] See student name (read-only)
- [ ] See grade level (read-only)
- [ ] See school name field (empty)
- [ ] See academic notes field (empty)
- [ ] Fill in school: "Lincoln High School"
- [ ] Fill in notes: "Strong in math, needs help with writing"
- [ ] Click "Save Changes"
- [ ] Should see "Profile updated successfully!"

### 7. Booking Page
- [ ] Visit `/booking` (or click "Book a Session")
- [ ] See student name pre-filled
- [ ] Select subject: "Math"
- [ ] Enter date: any future date
- [ ] Enter time: "3:00 PM"
- [ ] Add notes: "Need help with algebra"
- [ ] Click "Book Session"
- [ ] Should see success message
- [ ] Should redirect to `/dashboard`

### 8. Dashboard with Booking
- [ ] Go back to dashboard
- [ ] Should see your booked session in "Upcoming Sessions"
- [ ] Session shows subject, date, time
- [ ] "Join Session" button appears (will show after Zoom integration)

### 9. Tutor Dashboard
First, you need to manually create a tutor account:

In PostgreSQL:
```sql
-- Create tutor user
INSERT INTO users (email, name, password_hash, role, created_at) 
VALUES ('tutor@civiltutoring.com', 'Civil Tutor', '$2a$10$[hash]', 'tutor', NOW());

-- Get the ID from the insert above, then:
INSERT INTO tutors (user_id, bio, subjects, grades_teach, hourly_rate, created_at)
VALUES ([tutor_id], 'Expert Tutor', 'Math, Science, English', '6-12', 50, NOW());
```

Or run the setup script:
```bash
npx ts-node scripts/setup-tutor.ts
```

Then:
- [ ] Visit `/login`
- [ ] Enter email: "tutor@civiltutoring.com"
- [ ] Enter password: "SecurePassword123!"
- [ ] Should redirect to `/tutor-dashboard`
- [ ] Should see stats showing:
  - [ ] 1 Upcoming Session
  - [ ] 0 Completed Sessions
  - [ ] 1 Active Student
- [ ] Should see your booked session listed
- [ ] Session shows student name, subject, grade, time

### 10. Responsive Design Testing

#### Mobile (375px width - iPhone SE)
- [ ] All pages fit without horizontal scroll
- [ ] Buttons are large enough to tap
- [ ] Text is readable
- [ ] Navigation works
- [ ] Forms are easy to use
- [ ] Spacing looks good

#### Tablet (768px width - iPad)
- [ ] Layout adapts appropriately
- [ ] More content visible per screen
- [ ] Form fields have room to breathe
- [ ] Buttons align properly

#### Desktop (1200px+ width)
- [ ] Content is centered
- [ ] Max-width is respected
- [ ] Two-column layouts appear where appropriate
- [ ] All features are fully visible

### 11. Error Handling

#### Invalid Login
- [ ] Try login with wrong email → "Invalid email or password"
- [ ] Try login with wrong password → "Invalid email or password"
- [ ] Try login with empty fields → "Please enter both email and password"

#### Missing Required Fields
- [ ] Try signup without email → error message
- [ ] Try booking without subject → error message
- [ ] Try booking without date → error message

### 12. Authentication

#### Token Storage
- [ ] After login, open browser DevTools → Application → LocalStorage
- [ ] Should see `authToken` key with value
- [ ] Token persists after page refresh
- [ ] Token is cleared after logout

#### Protected Routes
- [ ] Try accessing `/dashboard` without logging in → redirect to `/login`
- [ ] Try accessing `/booking` without logging in → redirect to `/login`
- [ ] Try accessing `/profile` without logging in → redirect to `/login`
- [ ] Try accessing `/tutor-dashboard` without logging in → redirect to `/login`

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Performance Checks

- [ ] Page loads in under 3 seconds
- [ ] No console errors
- [ ] No console warnings (except expected)
- [ ] Images load quickly
- [ ] Forms submit quickly

## Accessibility Checks

- [ ] Can navigate with keyboard (Tab key)
- [ ] Form labels are associated with inputs
- [ ] Color contrast is sufficient
- [ ] Text is legible
- [ ] Buttons have focus states

## Common Issues & Solutions

### PostgreSQL Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
Solution: Make sure Docker container is running
```bash
docker compose up -d
docker compose ps  # verify it's running
```

### "Failed to fetch" errors
- Check browser console for CORS errors
- Ensure API endpoints match file paths
- Verify database is running

### Password not working after signup
- Make sure you're using the same password you entered in signup
- Check if bcryptjs hashing is working correctly

### Pages not found (404)
- Verify file paths match routes
- Check next.js is running in dev mode
- Try restarting: `npm run dev`

## Testing Scenarios

### Scenario 1: Complete User Journey
1. Parent signs up
2. Parent logs in
3. Parent books a session
4. Parent views booked session
5. Parent logs out
6. Tutor logs in
7. Tutor sees the booked session

### Scenario 2: Multiple Students
1. Create second parent account
2. Book session for different student
3. Verify both appear in tutor dashboard

### Scenario 3: Mobile User
1. Open site on phone or use browser mobile view
2. Complete full signup and booking flow
3. Verify all interactions work smoothly

---

**Note**: Print this checklist and check off each item as you test!
