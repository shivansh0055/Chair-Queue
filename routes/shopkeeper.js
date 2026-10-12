const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/cloudinary");
const upload = multer({ storage });

const Shop = require("../models/shop");
const Slot = require("../models/slot");
const Review = require("../models/review");
const { isLoggedIn, isShopkeeper } = require("../middleware/auth");

// Dashboard - list all shops owned by this shopkeeper
router.get("/dashboard", isLoggedIn, isShopkeeper, async (req, res) => {
  const shops = await Shop.find({ owner: req.session.userId });
  res.render("shopkeeper/dashboard", { shops });
});

// Form to add a new shop
router.get("/shops/new", isLoggedIn, isShopkeeper, (req, res) => {
  res.render("shopkeeper/new-shop", { mapboxToken: process.env.MAPBOX_TOKEN });
});

// Create shop
router.post("/shops", isLoggedIn, isShopkeeper, upload.single("image"), async (req, res) => {
  try {
    const { name, description, address, lng, lat } = req.body;

    if (!req.file) {
      req.flash("error", "Please upload a shop image.");
      return res.redirect("/shopkeeper/shops/new");
    }

    const shop = new Shop({
      owner: req.session.userId,
      name,
      description,
      address,
      image: { url: req.file.path, filename: req.file.filename },
      location: {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
    });

    await shop.save();
    req.flash("success", "Shop created successfully!");
    res.redirect("/shopkeeper/dashboard");
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not create shop.");
    res.redirect("/shopkeeper/shops/new");
  }
});

// View one shop (owner view) + manage slots + read reviews
router.get("/shops/:id", isLoggedIn, isShopkeeper, async (req, res) => {
  const shop = await Shop.findOne({ _id: req.params.id, owner: req.session.userId });
  if (!shop) {
    req.flash("error", "Shop not found.");
    return res.redirect("/shopkeeper/dashboard");
  }
  const slots = await Slot.find({ shop: shop._id }).populate("bookedBy", "name email phone").sort({ date: 1, startTime: 1 });

  const reviews = await Review.find({ shop: shop._id })
    .populate("customer", "name")
    .sort({ createdAt: -1 });
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  res.render("shopkeeper/shop-detail", { shop, slots, reviews, avgRating });
});

// Edit shop form
router.get("/shops/:id/edit", isLoggedIn, isShopkeeper, async (req, res) => {
  const shop = await Shop.findOne({ _id: req.params.id, owner: req.session.userId });
  if (!shop) {
    req.flash("error", "Shop not found.");
    return res.redirect("/shopkeeper/dashboard");
  }
  res.render("shopkeeper/edit-shop", { shop, mapboxToken: process.env.MAPBOX_TOKEN });
});

// Update shop
router.put("/shops/:id", isLoggedIn, isShopkeeper, upload.single("image"), async (req, res) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.id, owner: req.session.userId });
    if (!shop) {
      req.flash("error", "Shop not found.");
      return res.redirect("/shopkeeper/dashboard");
    }

    const { name, description, address, lng, lat } = req.body;
    shop.name = name;
    shop.description = description;
    shop.address = address;
    shop.location.coordinates = [parseFloat(lng), parseFloat(lat)];

    if (req.file) {
      shop.image = { url: req.file.path, filename: req.file.filename };
    }

    await shop.save();
    req.flash("success", "Shop updated.");
    res.redirect(`/shopkeeper/shops/${shop._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not update shop.");
    res.redirect(`/shopkeeper/shops/${req.params.id}/edit`);
  }
});

// Delete shop
router.delete("/shops/:id", isLoggedIn, isShopkeeper, async (req, res) => {
  await Shop.deleteOne({ _id: req.params.id, owner: req.session.userId });
  await Slot.deleteMany({ shop: req.params.id });
  req.flash("success", "Shop deleted.");
  res.redirect("/shopkeeper/dashboard");
});

// Add a new slot to a shop
router.post("/shops/:id/slots", isLoggedIn, isShopkeeper, async (req, res) => {
  try {
    const shop = await Shop.findOne({ _id: req.params.id, owner: req.session.userId });
    if (!shop) {
      req.flash("error", "Shop not found.");
      return res.redirect("/shopkeeper/dashboard");
    }

    const { date, startTime, endTime } = req.body;
    await Slot.create({ shop: shop._id, date, startTime, endTime });

    req.flash("success", "Slot added.");
    res.redirect(`/shopkeeper/shops/${shop._id}`);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      req.flash("error", "That exact slot already exists for this date.");
    } else {
      req.flash("error", "Could not add slot.");
    }
    res.redirect(`/shopkeeper/shops/${req.params.id}`);
  }
});

// Delete a slot (only if not booked)
router.delete("/shops/:shopId/slots/:slotId", isLoggedIn, isShopkeeper, async (req, res) => {
  const shop = await Shop.findOne({ _id: req.params.shopId, owner: req.session.userId });
  if (!shop) {
    req.flash("error", "Shop not found.");
    return res.redirect("/shopkeeper/dashboard");
  }

  const slot = await Slot.findById(req.params.slotId);
  if (slot && slot.isBooked) {
    req.flash("error", "Cannot delete a booked slot.");
    return res.redirect(`/shopkeeper/shops/${req.params.shopId}`);
  }

  await Slot.findByIdAndDelete(req.params.slotId);
  req.flash("success", "Slot removed.");
  res.redirect(`/shopkeeper/shops/${req.params.shopId}`);
});

module.exports = router;
