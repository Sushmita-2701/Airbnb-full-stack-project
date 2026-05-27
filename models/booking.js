const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({

  checkin: {
    type: Date,
    required: true
  },

  checkout: {
    type: Date,
    required: true
  },

  guests: {
    type: Number,
    required: true
  },

  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing",
    required: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Booking", bookingSchema);