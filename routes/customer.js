const express = require("express");
const router = express.Router();
const Shop = require("../models/shop");
const Slot = require("../models/slot");
const User = require("../models/user");
const Review = require("../models/review");
const { isLoggedIn, isCustomer } = require("../middleware/auth");
const { sendBookingEmail } = require("../config/mailer");

// Helper: attach { avgRating, reviewCount } onto each shop in an array
async function attachRatings(shops) {
  const shopIds = shops.map((s) => s._id);
  const stats = await Review.aggregate([
    { $match: { shop: { $in: shopIds } } },
    { $group: { _id: "$shop", avgRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
  ]);
  const statsMap = new Map(stats.map((s) => [String(s._id), s]));

  return shops.map((shop) => {
    const plain = shop.toObject ? shop.toObject() : shop;
    const stat = statsMap.get(String(shop._id));
    plain.avgRating = stat ? stat.avgRating : null;
    plain.reviewCount = stat ? stat.reviewCount : 0;
    return plain;
  });
}

// Customer dashboard - browse all shops, or nearest-first if lat/lng is given
router.get("/dashboard", isLoggedIn, isCustomer, async (req, res) => {
  const { lat, lng } = req.query;
  let shops;

  if (lat && lng) {
    // Sort shops by distance from the customer's location (nearest first)
    shops = await Shop.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distanceInMeters",
          spherical: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },
    ]);
  } else {
    shops = await Shop.find({}).populate("owner", "name");
  }

  shops = await attachRatings(shops);

  res.render("customer/dashboard", {
    shops,
    mapboxToken: process.env.MAPBOX_TOKEN,
    usedLocation: Boolean(lat && lng),
  });
});

// View a shop's details, map, available slots, and reviews
router.get("/shops/:id", isLoggedIn, isCustomer, async (req, res) => {
  const shop = await Shop.findById(req.params.id).populate("owner", "name phone");
  if (!shop) {
    req.flash("error", "Shop not found.");
    return res.redirect("/customer/dashboard");
  }
  const slots = await Slot.find({ shop: shop._id }).sort({ date: 1, startTime: 1 });

  const reviews = await Review.find({ shop: shop._id })
    .populate("customer", "name")
    .sort({ createdAt: -1 });

  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  // Has the current customer already reviewed this shop? Used to show "edit" vs "add"
  const myReview = reviews.find((r) => String(r.customer._id) === String(req.session.userId)) || null;

  res.render("customer/shop-detail", {
    shop,
    slots,
    reviews,
    avgRating,
    myReview,
    mapboxToken: process.env.MAPBOX_TOKEN,
  });
});

// Book a slot
router.post("/shops/:shopId/slots/:slotId/book", isLoggedIn, isCustomer, async (req, res) => {
  try {
    const slot = await Slot.findById(req.params.slotId);
    if (!slot) {
      req.flash("error", "Slot not found.");
      return res.redirect(`/customer/shops/${req.params.shopId}`);
    }
    if (slot.isBooked) {
      req.flash("error", "Sorry, that slot was just booked by someone else.");
      return res.redirect(`/customer/shops/${req.params.shopId}`);
    }

    slot.isBooked = true;
    slot.bookedBy = req.session.userId;
    slot.bookedAt = new Date();
    await slot.save();

    // Email the shopkeeper about the new booking (fire-and-forget - won't block the response)
    const shop = await Shop.findById(req.params.shopId).populate("owner", "name email");
    const customer = await User.findById(req.session.userId);
    if (shop && shop.owner && shop.owner.email) {
      sendBookingEmail({
        to: shop.owner.email,
        shopkeeperName: shop.owner.name,
        shopName: shop.name,
        customerName: customer ? customer.name : req.session.name,
        customerPhone: customer ? customer.phone : null,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }

    req.flash("success", "Slot booked successfully!");
    res.redirect(`/customer/shops/${req.params.shopId}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not book slot.");
    res.redirect(`/customer/shops/${req.params.shopId}`);
  }
});

// My bookings
router.get("/my-bookings", isLoggedIn, isCustomer, async (req, res) => {
  const bookings = await Slot.find({ bookedBy: req.session.userId })
    .populate("shop")
    .sort({ date: 1, startTime: 1 });
  res.render("customer/my-bookings", { bookings });
});

// Cancel a booking
router.delete("/my-bookings/:slotId", isLoggedIn, isCustomer, async (req, res) => {
  const slot = await Slot.findOne({ _id: req.params.slotId, bookedBy: req.session.userId });
  if (slot) {
    slot.isBooked = false;
    slot.bookedBy = null;
    slot.bookedAt = null;
    await slot.save();
    req.flash("success", "Booking cancelled.");
  }
  res.redirect("/customer/my-bookings");
});

// Add or update a review for a shop (one review per customer per shop)
router.post("/shops/:id/reviews", isLoggedIn, isCustomer, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      req.flash("error", "Shop not found.");
      return res.redirect("/customer/dashboard");
    }

    const ratingNum = parseInt(rating, 10);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
      req.flash("error", "Please choose a star rating between 1 and 5.");
      return res.redirect(`/customer/shops/${shop._id}`);
    }

    // Upsert: if this customer already reviewed this shop, update it instead of erroring
    await Review.findOneAndUpdate(
      { shop: shop._id, customer: req.session.userId },
      { rating: ratingNum, comment },
      { upsert: true, new: true, runValidators: true }
    );

    req.flash("success", "Thanks for your review!");
    res.redirect(`/customer/shops/${shop._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not save your review.");
    res.redirect(`/customer/shops/${req.params.id}`);
  }
});

// Delete your own review
router.delete("/shops/:id/reviews/:reviewId", isLoggedIn, isCustomer, async (req, res) => {
  await Review.deleteOne({ _id: req.params.reviewId, customer: req.session.userId });
  req.flash("success", "Review removed.");
  res.redirect(`/customer/shops/${req.params.id}`);
});

module.exports = router;
