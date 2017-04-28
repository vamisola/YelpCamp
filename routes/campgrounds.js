var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var multer      =   require('multer');
var geocoder = require('geocoder');


var storage =   multer.diskStorage({
  destination: function(req, file, callback) {
    callback(null, './public/uploads');
  },
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var upload = multer({ storage : storage}).any('image', 5);

// Define escapeRegex function for search feature
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

//INDEX - show all campgrounds
router.get("/", function(req, res){
    var regex;
    var query = Campground.find({});

    if (req.query.search && req.query.tags && req.xhr) {
        regex = new RegExp(escapeRegex(req.query.search), 'gi');
        query = Campground.find({name: regex}).where('tags').in(req.query.tags);
    } else if (req.query.search && req.xhr) {
        regex = new RegExp(escapeRegex(req.query.search), 'gi');
        query = Campground.find({name: regex});
    } else if (req.query.tags && req.xhr) {
        query = query.where('tags').in(req.query.tags);
    }
    
    
    query.exec(function(err, campgrounds) {
        if(err) {
            throw err;
        } else {
            if(req.xhr) {
                res.json(campgrounds);
            } else {
                res.render("campgrounds/index", {campgrounds: campgrounds, page: 'campgrounds', length: campgrounds.length});
            }
        }
    });
    
});
    
//   if(req.query.search && req.xhr) {
//       const regex = new RegExp(escapeRegex(req.query.search), 'gi');
//       // Get all campgrounds from DB
//       Campground.find({name: regex}, function(err, allCampgrounds){
//          if(err){
//             console.log(err);
//          } else {
//             res.status(200).json(allCampgrounds);
//          }
//       });
//   } else {
//       // Get all campgrounds from DB
//       Campground.find({}, function(err, allCampgrounds){
//          if(err){
//              console.log(err);
//          } else {
//             if(req.xhr) {
//               res.json(allCampgrounds);
//             } else {
//               res.render("campgrounds/index",{campgrounds: allCampgrounds, page: 'campgrounds'});
//             }
//          }
//       });
//   }


//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, function(req, res){
    // get data from form and add to campgrounds array
    upload(req,res,function(err) {
        if(err) {
            return res.send("Error uploading file.");
        }    
    
        var name = req.body.name;
        var price = req.body.price;
        
        var images =[];
        
        if(typeof req.files !== "undefined") {
            for(var i = 0; i < req.files.length; i++) {
                images.push("/uploads/" + req.files[i].filename);
            }
        } else {
            images.push('/uploads/no-image.png');
        }
        req.body.newCamp === "true" ? req.params = true : req.params = false;
        // req.body.newCamp === undefined ? req.params = false : req.params = true;
        req.body.newCamp = req.params;
        
        console.log(req.body.newCamp);
        var desc = req.body.description;
        var tags = req.body.tags;
        
        var newCamp = req.body.newCamp;
        console.log(newCamp);
        var author = {
            id: req.user._id,
            username: req.user.username
        };
        geocoder.geocode(req.body.location, function (err, data) {
            var lat = data.results[0].geometry.location.lat;
            var lng = data.results[0].geometry.location.lng;
            var location = data.results[0].formatted_address;

            var newCampground = {name: name, price: price, images: images, description: desc, tags: tags, newCamp: newCamp, author: author, location: location, lat: lat, lng: lng};
            // Create a new campground and save to DB
            Campground.create(newCampground, function(err, newlyCreated){
                if(err){
                    console.log(err);
                } else {
                    //redirect back to campgrounds page
                    res.redirect("/campgrounds");
                }
            });
        });
    });
});

//NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("campgrounds/new"); 
});

// SHOW - shows more info about one campground
router.get("/:id", function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err){
            console.log(err);
        } else {
            // console.log(foundCampground);
            //render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

//EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req,res){
    Campground.findById(req.params.id, function(err, foundCampground){
        if(err){
            req.flash("error","Campground not found.");
        }
        res.render("campgrounds/edit", {campground:foundCampground});
    });
});
//UPDATE CAMPGROUND ROUTE

router.put("/:id", middleware.checkCampgroundOwnership, function(req,res){
     upload(req,res,function(err) {
        if(err) {
            return res.send("Error uploading file.");
        }
        if(!req.body.campground.tags) {
            req.body.campground.tags = [];
        }
        //find and update the correct campground
       
        Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
            console.log(req.body.campground);
            if(err){
                res.redirect("/campgrounds");
            } else {
                // if new files have been uploaded, add them to images array
                if(req.files.length) {
                    for(var i = 0; i < req.files.length; i++) {
                        updatedCampground.images.push("/uploads/" + req.files[i].filename);
                    }
                    updatedCampground.save();
                }
                // if any images have been selected for removal, remove them from images array
                if(req.body.removals && req.body.removals.length) {
                    for(var i = 0; i < req.body.removals.length; i++) {
                        var index = updatedCampground.images.indexOf(req.body.removals[i]);
                        updatedCampground.images.splice(index, 1);
                    }
                    updatedCampground.save();
                }
                // if the no-image placeholder exists and other images exist, then remove it
                if(updatedCampground.images.length > 1 && updatedCampground.images.indexOf("/uploads/no-image.png") !== -1) {
                    updatedCampground.images.splice("/uploads/no-image.png", 1);
                    updatedCampground.save();
                }
                // if no images exist (all have been deleted) then add the no-image placeholder
                if(updatedCampground.images.length === 0) {
                    updatedCampground.images.push("/uploads/no-image.png");
                    updatedCampground.save();
                }
                res.redirect("/campgrounds/" + req.params.id);
            }
        });
    });
});

//DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req,res){
    Campground.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/campgrounds");
        }else{
            res.redirect("/campgrounds");
        }
    });
});


module.exports = router;
