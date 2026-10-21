// Checks the Supabase setup from .env.local without printing any secrets.
// Usage: node --env-file=.env.local scripts/check-supabase.mjs
// Creates the private "guides" bucket if it is missing (the table needs supabase/schema.sql).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;

const missing = Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
  SUPABASE_SECRET_KEY: secret,
}).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error("Missing in .env.local:", missing.join(", "));
  process.exit(1);
}

let ok = true;
const report = (pass, msg) => { console.log(`${pass ? "✓" : "✗"} ${msg}`); if (!pass) ok = false; };

const admin = createClient(url, secret, { auth: { persistSession: false } });
const anon = createClient(url, publishable, { auth: { persistSession: false } });

// A real select (not HEAD): HEAD responses carry no error body, so a missing table looks fine.
const table = await admin.from("guides").select("id").limit(1);
report(!table.error, table.error ? `guides table: ${table.error.message} — run supabase/schema.sql` : "guides table exists (secret key works)");

let bucket = await admin.storage.getBucket("guides");
if (bucket.error) {
  const made = await admin.storage.createBucket("guides", {
    public: false, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: ["image/jpeg"],
  });
  report(!made.error, made.error ? `could not create guides bucket: ${made.error.message}` : "created private guides bucket");
  bucket = await admin.storage.getBucket("guides");
}
report(!bucket.error && bucket.data?.public === false,
  bucket.error ? `guides bucket: ${bucket.error.message} — run supabase/schema.sql` : `guides bucket exists, public=${bucket.data.public}`);

// The publishable key must not see any rows.
const probeId = crypto.randomUUID();
if (!table.error) {
  await admin.from("guides").insert({ id: probeId, title: "setup probe", edit_token_hash: "x", frame_count: 1 });
  const leak = await anon.from("guides").select("id").eq("id", probeId);
  // Either RLS returns no rows, or the table isn't exposed to the publishable key at all.
  report(!!leak.error || leak.data.length === 0, "publishable key cannot read guides");
  await admin.from("guides").delete().eq("id", probeId);
}

// Signed upload with the publishable key and no storage policies (spec "verify early" #3).
if (!bucket.error) {
  const path = `guides/_probe/${probeId}.jpg`;
  const signed = await admin.storage.from("guides").createSignedUploadUrl(path);
  const jpeg = Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
  const up = signed.error ? signed : await anon.storage.from("guides").uploadToSignedUrl(path, signed.data.token, jpeg, { contentType: "image/jpeg" });
  report(!up.error, up.error ? `signed upload with publishable key failed: ${up.error.message}` : "signed upload works with the publishable key");
  const pub = await anon.storage.from("guides").download(path);
  report(!!pub.error, "publishable key cannot download from the private bucket");
  await admin.storage.from("guides").remove([path]);
}

process.exit(ok ? 0 : 1);
