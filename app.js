require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const methodOverride = require("method-override");

const connectDB = require("./config/db");
const { setCurrentUser } = require("./middleware/auth");
const Shop = require("./models/shop");
const Slot = require("./models/slot");

const authRoutes = require("./routes/auth");
const shopkeeperRoutes = require("./routes/shopkeeper");
const customerRoutes = require("./routes/customer");

const app = express();
const PORT = process.env.PORT || 8080;

connectDB();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.use(flash());
app.use(setCurrentUser);

// Routes
app.get("/", async (req, res) => {
  if (!req.session.userId) {
    return res.render("home");
  }

  if (req.session.role === "customer") {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const upcomingBooking = await Slot.findOne({
      bookedBy: req.session.userId,
      isBooked: true,
      date: { $gte: todayStr },
    })
      .populate("shop", "name address image")
      .sort({ date: 1, startTime: 1 });

    const bookingCount = await Slot.countDocuments({
      bookedBy: req.session.userId,
      isBooked: true,
    });

    return res.render("home-customer", { upcomingBooking, bookingCount });
  }

  if (req.session.role === "shopkeeper") {
    const shops = await Shop.find({ owner: req.session.userId });
    const shopIds = shops.map((s) => s._id);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const upcomingBookingsCount = await Slot.countDocuments({
      shop: { $in: shopIds },
      isBooked: true,
      date: { $gte: todayStr },
    });

    return res.render("home-shopkeeper", { shopCount: shops.length, upcomingBookingsCount });
  }

  res.render("home");
});
app.use("/", authRoutes);
app.use("/shopkeeper", shopkeeperRoutes);
app.use("/customer", customerRoutes);

// 404
app.use((req, res) => {
  res.status(404).render("404");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
