// DEPRECATED - replaced by setup-tutor.mjs
//
// This version required ts-node (which was never in package.json) and did not
// load .env.local, so DATABASE_URL was undefined when run standalone. It also
// wrote a users.id into tutor_availability.tutor_id, which references tutors(id).
//
// Use instead:   node scripts/setup-tutor.mjs
