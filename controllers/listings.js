const Listing = require("../models/listing");
const fetch = require("node-fetch");

// ================= INDEX (SEARCH + FILTER + PAGINATION) =================
 module.exports.index = async (req, res) => {
  const { search, amenity, category, page = 1 } = req.query;

  const limit = 9; // listings per page
  const skip = (page - 1) * limit;

  let query = {};

  // Search by title or location
  if (search) {
    query.$or = [
      { title: new RegExp(search, "i") },
      { location: new RegExp(search, "i") }
    ];
  }

  // Amenity filter (pool, mountain, etc.)
  if (amenity) {
    query.amenities = amenity;
  }

  // Trending filter
  if (category === "trending") {
    query.isTrending = true;
  }

  const totalListings = await Listing.countDocuments(query);

  const allListings = await Listing.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.render("listings/index.ejs", {
    allListings,
    currentPage: Number(page),
    totalPages: Math.ceil(totalListings / limit),
    search,
    amenity,
    category
  });
};


// ================= RENDER NEW FORM =================
module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

// ================= SHOW SINGLE LISTING =================
module.exports.showListing = async (req, res) => {
  let { id } = req.params;

  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: { path: "author" }
    })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested does not exist");
    return res.redirect("/listings");
  }

  res.render("listings/show.ejs", { listing });
};

// ================= CREATE LISTING =================

module.exports.createListing = async (req, res) => {
  const location = req.body.listing.location;

  const geoResponse = await fetch(
    `https://us1.locationiq.com/v1/search.php?key=${process.env.MAP_TOKEN}&q=${encodeURIComponent(location)}&format=json&limit=1`
  );

  const geoData = await geoResponse.json();

  if (!geoData.length) {
    req.flash("error", "Invalid location");
    return res.redirect("/listings/new");
  }

  const url = req.file.path;
  const filename = req.file.filename;

  const newListing = new Listing(req.body.listing);

  newListing.isTrending = req.body.listing.isTrending || false;

  newListing.owner = req.user._id;
  newListing.image = { url, filename };

  //  Save geometry
  newListing.geometry = {
    type: "Point",
    coordinates: [
      parseFloat(geoData[0].lon),
      parseFloat(geoData[0].lat)
    ]
  };

  console.log("GEOMETRY SAVED:", newListing.geometry); // check in terminal

  await newListing.save();

  req.flash("success", "New Listing Created");
  res.redirect("/listings");
};

// ================= RENDER EDIT FORM =================
module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;

  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you requested does not exist");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url.replace(
    "/upload",
    "/upload/w_250"
  );

  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

// ================= UPDATE LISTING =================
module.exports.updateListing = async (req, res) => {
let { id } = req.params;
  try {
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});

    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }

    // Step 2A: Update normal fields
    listing.title = req.body.listing.title;
    listing.description = req.body.listing.description;
    listing.price = req.body.listing.price;
    listing.location = req.body.listing.location;
    listing.country = req.body.listing.country;

    //  Step 2B: Update geometry (map coordinates)
    if (req.body.listing.location) {
      const geoResponse = await fetch(
        `https://us1.locationiq.com/v1/search.php?key=${process.env.MAP_TOKEN}&q=${encodeURIComponent(req.body.listing.location)}&format=json&limit=1`
      );
      const geoData = await geoResponse.json();

      if (geoData.length) {
        listing.geometry = {
          type: "Point",
          coordinates: [
            parseFloat(geoData[0].lon),
            parseFloat(geoData[0].lat)
          ]
        };
        console.log("Updated geometry:", listing.geometry.coordinates);
      } else {
        console.warn("Could not geocode updated location, keeping old coordinates");
      }
    }

    if (typeof req.file !== "undefined") {
      let url = req.file.path;
      let filename = req.file.filename;
      listing.image = { url, filename };

    await listing.save();
    }
    req.flash("success", "Listing updated successfully");
    res.redirect(`/listings/${id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Error updating listing");
    res.redirect(`/listings/${id}/edit`);
  }
};

// ================= DELETE LISTING =================
module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;

  await Listing.findByIdAndDelete(id);

  req.flash("success", "Listing Deleted");
  res.redirect("/listings");
};

