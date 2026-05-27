if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");

const nodemailer = require("nodemailer");

const User = require("./models/user");
const Listing = require("./models/listing");
const Booking = require("./models/booking");

const listingRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// ================= ENV =================
const dbUrl = process.env.ATLASDB_URL;

// ================= DB CONNECT =================
mongoose
  .connect(dbUrl)
  .then(() => {
    console.log("✅ Connected to DB");
  })
  .catch((err) => {
    console.error("❌ DB Connection Error:", err);
  });

// ================= VIEW ENGINE =================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.engine("ejs", ejsMate);

// ================= MIDDLEWARE =================
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// ================= SESSION STORE =================
const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("❌ ERROR IN MONGO SESSION STORE", err);
});

// ================= SESSION CONFIG =================
const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

// ================= PASSPORT =================
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// ================= FLASH GLOBAL =================
app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
});

// ================= ROUTES =================
app.get("/", async (req, res) => {
  const listings = await Listing.find({});
  res.render("listings/index", { listings });
});

app.get("/demouser", async (req, res) => {
  let fakeUser = new User({
    email: "student@gmail.com",
    username: "delta-student",
  });

  const registeredUser = await User.register(fakeUser, "helloworld");
  res.send(registeredUser);
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewsRouter);
app.use("/", userRouter);

// ================= BOOKING ROUTES =================

// GET booking page
app.get("/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    return res.send("Listing not found");
  }

  res.render("booking/booking", { listing });
});

// POST booking
app.post("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { checkin, checkout, guests } = req.body;

    const listing = await Listing.findById(id);

    if (!listing) {
      return res.send("Listing not found");
    }

    if (!req.user) {
      return res.redirect("/login");
    }

    const booking = new Booking({
      checkin,
      checkout,
      guests,
      listing: listing._id,
      user: req.user._id,
    });

    await booking.save();

    req.flash("success", "Booking Done ✅");
    res.redirect("/listings");
  } catch (err) {
    console.log("❌ BOOKING ERROR:", err);
    res.send("Booking Failed");
  }
});

// ================= ERROR HANDLING =================
app.use((err, req, res, next) => {
  console.log("❌ ERROR:", err);

  let { statusCode = 500, message = "Something went wrong" } = err;

  res.status(statusCode).render("error.ejs", { message });
});

// ================= SERVER =================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});