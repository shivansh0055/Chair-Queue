# Chair&Queue — Saloon Customer Management System

Full-stack booking app: shopkeepers list saloons with photos and a map pin,
open custom time slots per day, and customers book vacant slots (shown red once booked).

**Stack:** Node.js, Express, EJS, MongoDB/Mongoose, Bootstrap-free custom CSS,
Mapbox GL JS for maps, Cloudinary for image storage.

## 1. Prerequisites

- Node.js 18+
- MongoDB running locally (`mongod`) — default expects `mongodb://127.0.0.1:27017`
- A free [Cloudinary](https://cloudinary.com) account (cloud name, API key, API secret)
- A free [Mapbox](https://account.mapbox.com) account (public access token)
- A Gmail account for sending booking notification emails (optional but recommended)

## 2. Setup

```bash
cd saloon-app
npm install
cp .env.example .env
```

Open `.env` and fill in:

```
MONGO_URI=mongodb://127.0.0.1:27017/saloonDB
SESSION_SECRET=some_long_random_string
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
MAPBOX_TOKEN=pk.xxxxxxxx
EMAIL_USER=youraddress@gmail.com
EMAIL_PASS=your_16_char_app_password
PORT=8080
```

### Setting up EMAIL_USER / EMAIL_PASS (for booking notifications)

The app emails the shopkeeper whenever a customer books a slot. This uses
Gmail SMTP, which requires an **App Password** (not your normal Gmail login):

1. Go to your Google Account → Security → 2-Step Verification, and turn it on if it isn't already.
2. Once enabled, go to Security → App passwords.
3. Generate a new app password (choose "Mail" as the app).
4. Copy the 16-character password Google gives you into `EMAIL_PASS` in `.env`.
5. Put your Gmail address in `EMAIL_USER`.

If you skip this step, the app still works fine — bookings just won't
trigger an email (you'll see a console log saying email isn't configured).

## 3. Run

Make sure MongoDB is running locally, then:

```bash
npm start
```

or with auto-reload during development:

```bash
npm run dev
```

Visit **http://localhost:8080**

## 4. How it works

- **Sign up** as either a customer or a shopkeeper (toggle on the signup page).
- **Shopkeepers**: from "My shops" → "List a new shop", upload a photo (goes to
  Cloudinary), fill address, and click the map to drop a pin (Mapbox). After
  creating a shop, open it to add time slots (date + start/end time) — each
  shopkeeper can list multiple shops.
- **Customers**: "Browse shops" shows all saloons on a Mapbox map plus a grid.
  Opening a shop shows its slots grouped by date — vacant slots have a "Book"
  button; booked slots turn **red** with a "BOOKED" tag; slots the current
  customer booked themselves are shown in green as "YOUR BOOKING".
- **My bookings** (customer) lists all their bookings with a cancel option,
  which frees the slot back up.
- When a customer books a slot, the shopkeeper who owns that shop gets an
  **email notification** with the customer's name, phone, and the slot's
  date/time (see the email setup section above).

## 5. Switching to MongoDB Atlas later

Just change one line in `.env`:

```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/saloonDB
```

No code changes needed — `config/db.js` reads from `MONGO_URI`.

## 6. Project structure

```
saloon-app/
├── app.js                 # Express app entry point
├── config/
│   ├── db.js               # Mongoose connection
│   └── cloudinary.js       # Cloudinary + multer storage config
├── models/
│   ├── user.js              # customer/shopkeeper accounts, password hashing
│   ├── shop.js               # shop with GeoJSON location + Cloudinary image
│   └── slot.js                # per-day time slots, booking state
├── middleware/
│   └── auth.js              # login/role guards, flash + currentUser locals
├── routes/
│   ├── auth.js               # signup/login/logout
│   ├── shopkeeper.js         # shop CRUD, slot management
│   └── customer.js           # browse shops, book/cancel slots
├── views/                  # EJS templates (home, auth, shopkeeper/*, customer/*)
└── public/css/style.css    # all styling
```

## Notes

- Passwords are hashed with bcrypt; sessions are stored in MongoDB via `connect-mongo`.
- A slot can't be double-booked: the booking route checks `isBooked` before writing.
- Shop images are stored on Cloudinary (not on disk), so they work the same
  in local dev and once deployed.
- Bootstrap wasn't ultimately used for styling — a custom, saloon-themed
  design system is used instead so the UI doesn't look like a generic
  template. If you'd specifically like Bootstrap classes/components wired in
  on top of this, let me know and I can add `bootstrap` via CDN and restyle.
