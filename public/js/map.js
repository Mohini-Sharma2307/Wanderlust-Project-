if (
  listing.geometry &&
  Array.isArray(listing.geometry.coordinates) &&
  listing.geometry.coordinates.length === 2
  ){
  const coords = listing.geometry.coordinates;

  const map = new maplibregl.Map({
    container: "map",
    style: `https://tiles.locationiq.com/v3/streets/vector.json?key=${mapToken}`,
    center: coords,
    zoom: 9,
  });

  // ✅ Popup create karo
  const popup = new maplibregl.Popup({ offset: 25 })
    .setHTML(`
      <h4>${listing.title}</h4>
      <p>Exact Location will be provided after booking </p>
    `);

  new maplibregl.Marker({ color: "red" })
    .setLngLat(coords)
    .setPopup(popup) 
    .addTo(map);

    //popup.addTo(map); 

} else {
  console.error("Invalid or missing coordinates:", listing.geometry);
}
