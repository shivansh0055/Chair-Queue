const express = require("express");
const router = express.Router();
const User = require("../models/user");

// Show signup form (role passed as query param: ?role=customer or ?role=shopkeeper)
router.get("/signup", (req, res) => {
  const role = req.query.role === "shopkeeper" ? "shopkeeper" : "customer";
  res.render("auth/signup", { role });
});

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      req.flash("error", "An account with that email already exists.");
      return res.redirect(`/signup?role=${role}`);
    }

    const user = new User({ name, email, password, phone, role });
    await user.save();

    req.session.userId = user._id;
    req.session.name = user.name;
    req.session.role = user.role;

    req.flash("success", `Welcome, ${user.name}!`);
    return res.redirect(user.role === "shopkeeper" ? "/shopkeeper/dashboard" : "/customer/dashboard");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong during signup.");
    res.redirect("/signup");
  }
});

// Show login form
router.get("/login", (req, res) => {
  res.render("auth/login");
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      req.flash("error", "Incorrect email or password.");
      return res.redirect("/login");
    }

    req.session.userId = user._id;
    req.session.name = user.name;
    req.session.role = user.role;

    req.flash("success", `Welcome back, ${user.name}!`);
    return res.redirect(user.role === "shopkeeper" ? "/shopkeeper/dashboard" : "/customer/dashboard");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong during login.");
    res.redirect("/login");
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

module.exports = router;
