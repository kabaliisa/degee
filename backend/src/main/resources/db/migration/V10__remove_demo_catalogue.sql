-- Take the demo catalogue out.
--
-- V4 and V8 put five invented artists, six releases, sixteen tracks and five AI-generated
-- recordings into every database, so that the app had something to show while it was being built.
-- That was scaffolding. It is now the first thing a real visitor sees, and the songs are not music
-- anybody made.
--
-- V4 and V8 are left exactly as they are rather than emptied: Flyway records a checksum for every
-- migration it has applied, so editing one that has already run makes the API refuse to start
-- against every existing database. Adding a migration that undoes them is the only safe way, and
-- it costs a fresh database one wasted insert-then-delete.
--
-- Written against the seeded ids rather than "everything", so that a real artist who has already
-- signed up is untouched, whatever order these run in.

DELETE FROM track_writers WHERE track_id IN (
    't1','t2','t3','t4','t5','t6','t7','t8','t9','t10','t11','t12','t13','t14','t15','t16');

-- Anything a fan already owns or saved. Empty in practice -- nobody bought a demo song -- but
-- these rows reference tracks and would hold the delete up.
DELETE FROM entitlements WHERE track_id IN (
    't1','t2','t3','t4','t5','t6','t7','t8','t9','t10','t11','t12','t13','t14','t15','t16');

-- Gifts and rights declarations point at the demo artists and their releases. Both are empty in
-- practice and both would hold the delete up if they were not.
DELETE FROM gifts WHERE artist_id IN ('a1','a2','a3','a4','a5');
DELETE FROM rights_declarations WHERE release_id IN ('r1','r2','r3','r4','r5','r6');

-- The recordings themselves are keys on the track row, so they go with it. The files they name
-- were AI-generated and no longer ship: see src/test/resources/seed-media, where the tests keep
-- their own generated tones instead.
DELETE FROM tracks WHERE artist_id IN ('a1','a2','a3','a4','a5');
DELETE FROM releases WHERE artist_id IN ('a1','a2','a3','a4','a5');

-- Earnings accounts go only if nothing was ever posted to them. An account with entries is a
-- record of money that moved, and the ledger is the one place in this system where nothing is
-- quietly thrown away -- so a demo artist who somehow earned keeps their account and their row.
DELETE FROM ledger_accounts
WHERE kind = 'ARTIST_EARNINGS'
  AND owner_ref IN ('a1','a2','a3','a4','a5')
  AND balance_ugx = 0
  AND id NOT IN (SELECT DISTINCT account_id FROM ledger_entries);

DELETE FROM artists
WHERE id IN ('a1','a2','a3','a4','a5')
  AND id NOT IN (SELECT owner_ref FROM ledger_accounts WHERE kind = 'ARTIST_EARNINGS');
