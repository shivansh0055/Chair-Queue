module.exports.isLoggedIn = (req, res, next) => {
  if (!req.session.userId) {
    req.flash("error", "You must be logged in first.");
    return res.redirect("/login");
  }
  next();
};

module.exports.isShopkeeper = (req, res, next) => {
  if (req.session.role !== "shopkeeper") {
    req.flash("error", "Only shopkeepers can access that page.");
    return res.redirect("/");
  }
  next();
};

module.exports.isCustomer = (req, res, next) => {
  if (req.session.role !== "customer") {
    req.flash("error", "Only customers can access that page.");
    return res.redirect("/");
  }
  next();
};

// Makes currentUser info available in all EJS templates
module.exports.setCurrentUser = (req, res, next) => {
  res.locals.currentUser = req.session.userId
    ? { id: req.session.userId, name: req.session.name, role: req.session.role }
    : null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
};
