$('#campground-search').on('input', function() {
  query(this);
});

$('#campground-search').submit(function(event) {
  event.preventDefault();
});

$('input:checkbox').change(function() {
  query(this);
});


function query(_this) {
  var search;
  if(_this.id) {
    search = $(_this).serialize();
  } else {
      search = $(_this.form).serialize();
  }
  if(search === "search=") {
    search = "all";
  }
  $.get('/campgrounds?' + search, function(data) {
    $('#campground-grid').html('');
    data.forEach(function(campground) {
      $("#length").text(data.length);
      $('#campground-grid').append(`
        <div class="col-md-3 col-sm-6">
          <div class="thumbnail">
            <img src="${ campground.images[0] }">
            <div class="caption">
              <h4>${ campground.name }</h4>
            </div>
           
            <p>
              <a href="/campgrounds/${ campground._id }" class="btn btn-primary">More Info</a>
            </p>
          </div>
        </div>
      `);
    });
  });
}
