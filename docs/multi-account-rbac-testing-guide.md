# V2.2 Testing Guide — Step by Step

> Goal: make sure the multi-account + RBAC system works on your machine before pushing to production. Follow these steps in order.

---

## Part 0 — Before you start (5 min, safety first)

### 0.1  Back up your local database

If your local Postgres has any data you care about, dump it first. This is your safety net.

```bash
docker exec -t <your-postgres-container> pg_dump -U horeca1 horeca1 > backup-before-v22-$(date +%s).sql
```

If you have no local data (fresh DB) you can skip this.

### 0.2  Make sure Postgres is running

```bash
docker compose up -d postgres
```

Check it's actually up:

```bash
docker ps | grep postgres
```

You should see a postgres container running on port 5433.

---

## Part 1 — Apply the database migrations (10 min)

There are THREE steps. Do them in this exact order.

### 1.1  Apply Step A (add new tables + nullable columns)

```bash
npx prisma migrate deploy
```

**What to expect:**
- It says "Applying migration `20260520_hcid_architecture_step_a`"
- Finishes in a few seconds
- No errors

**If you see errors:**
- "Can't reach database" → Postgres isn't running, go back to 0.2
- "Migration already applied" → fine, skip to 1.2
- Anything else → STOP and paste the error to me

### 1.2  Run the data backfill script

```bash
npx tsx prisma/migrations/20260520_hcid_architecture_step_a/data_migrate.ts
```

**What to expect:**
```
═══ V2.2 HCID Architecture — Data Backfill ═══
→ Seeding system role templates …
   18 created, 0 already present
→ Backfilling User.hcid_display …
   <N> users assigned HCID
→ Migrating Vendors → BusinessAccount + Outlet + Owner UserRole …
   <N> vendors migrated
→ Migrating Brands → BusinessAccount + Brand HQ Outlet + Owner UserRole …
   <N> brands migrated
→ Provisioning BusinessAccount for customer Users with no membership …
   <N> customer accounts provisioned
→ Migrating VendorTeamMembers → BusinessAccountMember + UserRole …
   <N> vendor team members migrated (<M> skipped — vendor not yet linked)
→ Migrating BrandTeamMembers → BusinessAccountMember + UserRole …
   <N> brand team members migrated
→ Backfilling Outlet rows from SavedAddress (non-default) …
→ Stamping orders with businessAccountId + outletId + deliveryAddressSnapshot …
→ Stamping carts …
→ Stamping quick order lists …
→ Stamping customer-vendor follows …
═══ Done in Xs ═══
```

**If you see errors:**
- "Missing seeded template" → seeding failed; rerun the script (it's idempotent)
- "command not found: tsx" → `npm i -D tsx` then retry
- Anything else → STOP and paste it to me

### 1.3  Apply Step C (lock everything down, drop legacy)

```bash
npx prisma migrate deploy
```

**What to expect:**
- "Applying migration `20260520_hcid_architecture_step_c`"
- Finishes in seconds

**If you see "Step C aborted: N rows without business_account_id":**
- The backfill in step 1.2 missed some rows. Don't panic.
- Re-run step 1.2 (`npx tsx prisma/migrations/20260520_hcid_architecture_step_a/data_migrate.ts`)
- Then re-run 1.3

This safety check is intentional — Step C refuses to enforce NOT NULL on rows that are still NULL, so you can't accidentally break things.

### 1.4  Verify with a quick SQL peek (optional but recommended)

Open Prisma Studio:

```bash
npx prisma studio
```

In the browser tab that opens, click these tables one by one and check the row counts roughly look right:
- `BusinessAccount` — should have AT LEAST (vendors + brands + customers with addresses)
- `Outlet` — should have AT LEAST (saved_addresses + 1 per vendor + 1 per brand)
- `AccountRole` — should have 18 system templates (where `businessAccountId` is null)
- `UserRole` — should have one row per vendor owner + one per brand owner + one per customer + every team member

Close Prisma Studio when done.

---

## Part 2 — Start the app (1 min)

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

**What to expect:** the homepage loads normally. No errors in the terminal. If something crashes immediately, paste the terminal output to me.

---

## Part 3 — Test sign-in for an EXISTING user (5 min)

Pick a real user from your DB. (Easiest: look at `prisma studio` → User table, copy a phone number.)

### 3.1  Sign in via phone OTP

1. On the homepage, click **Sign in / Login**.
2. Enter the phone number.
3. Get the OTP code from your dev console (or from the SMS provider's test inbox if MSG91 isn't stubbed).
4. Enter the OTP code.
5. **Expected**: you're signed in.

### 3.2  Check the navbar shows the new switcher

Look at the top-right of the page (or in the admin/vendor portal header if you're a vendor).

**You should see:**
- A small avatar circle with your initials
- Your business name (legalName) underneath the name field
- A smaller line below saying the **current outlet name** with a tiny map-pin icon
- A chevron pointing down

**If you don't see your business name and outlet:** the JWT might be stale. Sign out and sign back in. If still wrong, paste a screenshot.

### 3.3  Click the switcher dropdown

**You should see:**
- A header with your account name, your HCID (looks like `HC-A4F2-9X3K`), and a colored role chip (Vendor / Customer / Brand)
- An "Active Outlet" section showing the current outlet name, with a right arrow
- A "Switch Account" section if you have more than one account (otherwise hidden)
- A "Manage account" link
- A red "Sign out" button at the bottom

**If anything is missing or broken:** screenshot it and tell me.

### 3.4  Click "Manage account"

It should take you to `/account/[some-id]` showing:
- A header with your business name, legal name, GST number
- Colored tags (Customer / Vendor / Brand)
- Tabs: Overview · Outlets · Users · Roles
- Three stat cards (Outlets, Members, Custom Roles)
- A "Business Details" panel

**Bug to look for:** if "Address needed" stat is shown on the Outlets card, click it. You should see your outlets list. Migrated outlets may show an amber "Address needed" chip if they came from incomplete data.

---

## Part 4 — Test the permission matrix (THE big feature) (5 min)

This is the centerpiece of V2.2. Test it carefully.

### 4.1  Open the Roles tab

From the account page, click the **Roles** tab. You should see two sections:
- **Custom Roles** (probably empty at first)
- **System Templates** (18 of them: Owner, Procurement Manager, Vendor Admin, Brand Admin, etc.)

### 4.2  Duplicate a template

1. Find "Procurement Manager" in the templates list.
2. Click **Duplicate** (or the copy icon).
3. A big modal opens with:
   - A name field pre-filled "Procurement Manager (copy)"
   - A scope dropdown
   - A description field
   - **A big grid** with modules on the left (Dashboard, Products, Orders, Inventory, etc.) and actions across the top (View, Create, Edit, Delete, Approve)
   - Green checkboxes ✓ where the template grants permission, empty boxes elsewhere, `—` where an action isn't available for that module

### 4.3  Click checkboxes to change permissions

- Click an empty box → it turns green ✓
- Click a green ✓ → it turns empty
- The counter at the bottom-left ("X permission(s) selected") updates live

### 4.4  Save the role

1. Change the name to something like "Senior Procurement Manager".
2. Click **Create role** at the bottom-right.
3. The modal closes and your new role appears under **Custom Roles**.

### 4.5  Edit it again

1. Click **Edit** on your new role.
2. The same modal opens with your saved permissions checked.
3. Toggle a few checkboxes.
4. Click **Save changes**.
5. The role updates.

### 4.6  Try to delete it

1. Click the trash icon next to your custom role.
2. Confirm.
3. Role disappears.

**If you can't delete it because it says "Role is assigned to X user(s)":** that's CORRECT behavior — you have to unassign users first.

### 4.7  Try to edit a system template

1. Click **Edit** on a system template (e.g. "Owner"). There should be NO edit button on system templates — only **Duplicate**.

**If you see Edit on a system template:** bug, tell me.

---

## Part 5 — Test inviting a user (5 min)

### 5.1  Open the Users tab

You should see a list of current members. The current user (you) is marked **Primary**.

### 5.2  Invite another existing user

1. Click **Invite member** (top right).
2. In the modal:
   - **Identifier**: enter the email or phone of another existing user in your DB
   - **Role**: pick one (e.g. "Viewer" or the custom role you made earlier)
   - **Outlet**: leave as "All outlets"
3. Click **Send Invite**.

**Expected**: the modal closes and the invited user appears in the list with their role chip.

**If you see "User not found":** that means invitee-by-email-signup isn't supported in V2.2 — you have to invite someone who already has an account. Pick a different user.

### 5.3  Try to remove yourself

1. Click the trash icon next to your own row (you're the Primary owner).
2. **Expected**: error message "Cannot remove the last Owner of the account".

If you CAN remove yourself, that's a bug.

### 5.4  Remove the user you just invited

1. Click the trash icon next to them.
2. Confirm.
3. They disappear.

---

## Part 6 — Test outlet management (5 min)

### 6.1  Open the Outlets tab

You should see at least one outlet (your migrated primary outlet).

### 6.2  Add a new outlet

1. Click **Add Outlet** (top right).
2. Fill in:
   - **Name**: e.g. "Eve Worli"
   - **Address**: any street address
   - **City / State / Pincode**: fill in real values
3. Click **Create Outlet**.

**Expected**: modal closes, new outlet appears in the list.

Note: it'll be marked "Address needed" because lat/lng aren't set. That's expected — full address geocoding is a future feature.

### 6.3  Switch outlets via the navbar

1. Open the navbar switcher.
2. Click on the "Active Outlet" row.
3. The dropdown shows an outlet picker with all your outlets.
4. Click your newly-created outlet.

**Expected**: page reloads or refreshes silently, navbar now shows the new outlet name, cart is empty (because cart is per-outlet).

---

## Part 7 — Test multi-account switching (5 min)

Only relevant if you have multiple accounts. Skip if you only have one.

### 7.1  Create a second account

1. From the account overview page, go back to the homepage.
2. Use Postman or browser console to call:
   ```bash
   curl -X POST http://localhost:3000/api/v1/account \
     -H "Content-Type: application/json" \
     -H "Cookie: <copy your auth cookie from browser>" \
     -d '{
       "legalName": "Test Second Business",
       "isCustomer": true,
       "primaryOutlet": {
         "name": "Test Outlet",
         "addressLine": "123 Test St"
       }
     }'
   ```
3. **Expected**: HTTP 201, returns the new account + outlet.

OR easier: do this directly in `prisma studio` by creating a `BusinessAccount` row + an `Outlet` row + a `BusinessAccountMember` row linking you + a `UserRole` row pointing to the Owner template.

### 7.2  Refresh the homepage

**Expected**: the **PostLoginAccountSelector modal pops up** showing both your accounts. Pick one to continue. The modal goes away.

### 7.3  Switch via the navbar

Open the switcher, click the other account in the "Switch Account" section.

**Expected**: page refreshes, navbar shows the new business name, cart is now empty (different account = different cart).

---

## Part 8 — Test placing an order (CRITICAL) (5 min)

This tests cart + checkout + the outlet stamping.

### 8.1  Add items to cart

1. As a customer (any account with `isCustomer: true`), go to a vendor store.
2. Add 2-3 items to cart.

**If add-to-cart fails with "No active outlet selected":** your active outlet's address isn't complete. Go to the Outlets tab, edit the outlet to add a full address with real lat/lng, then try again.

### 8.2  Go to checkout

1. Click **Checkout** from the cart.
2. **Note**: there is NO separate "pick an outlet" step at checkout (intentional — it uses your session outlet).
3. Pick a delivery slot.
4. Click **Place Order**.

**Expected**: order is placed, redirect to order success page.

**If order fails with "Active outlet needs its address completed":** that's correct behavior — outlets flagged "Address needed" can't receive orders. Fix the outlet first.

### 8.3  Verify the order has the right stamping

Open `prisma studio` → Orders → find your new order.

Check that these fields are filled in:
- `business_account_id` (UUID of your account)
- `outlet_id` (UUID of your active outlet)
- `delivery_address_snapshot` (JSON with the outlet's address)

**If any are NULL**: bug, tell me.

---

## Part 9 — Test the existing vendor/admin portals still work (5 min)

This catches regressions in the 49 legacy routes that I left alone.

### 9.1  As a vendor

1. Sign in as a vendor user.
2. Go to `/vendor/dashboard`. **Expected**: loads with your stats.
3. Go to `/vendor/orders`. **Expected**: lists your orders.
4. Go to `/vendor/products`. **Expected**: lists your products.
5. Go to `/vendor/inventory`. **Expected**: lists your inventory.

**If any of these crash or show "No vendor profile linked":** the legacy `resolveVendorContext` is broken. Tell me which page.

### 9.2  As an admin

1. Sign in as an admin user.
2. Go to `/admin/dashboard`. **Expected**: loads.
3. Go to `/admin/vendors`. **Expected**: lists vendors.
4. Go to `/admin/orders`. **Expected**: lists orders.

---

## Part 10 — Sign out (1 min)

1. Open the navbar switcher.
2. Click **Sign out**.

**Expected**: redirected to home as a logged-out user. Cart, wishlist, all caches cleared.

---

## When you're done

### If everything worked
Come back and tell me "all good, push it" and I'll:
1. Commit the 4 uncommitted chunks (cart+order outlet · cleanup · login completeness · client report numbers)
2. Push all stacked commits (6+) to origin/master.

### If something broke
- Take a screenshot if it's a UI bug
- Copy the terminal output if it's a server bug
- Tell me which step failed and paste what you saw
- I'll fix it on top (no commits, no push) and you can retest

### If you want to roll back
```bash
# Restore your pre-V2.2 database backup
docker exec -i <postgres-container> psql -U horeca1 horeca1 < backup-before-v22-<timestamp>.sql

# Revert the code (this nukes both local commits AND uncommitted changes)
git reset --hard aa767cf
```

> Heads-up: only do this if testing fails badly. The pushed commits 1-5 are still on origin and would need a separate force-push to undo there.
