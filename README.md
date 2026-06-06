# H5P Interactive Map

An H5P library that allows creating dynamic, interactive maps using the **Leaflet** framework. With this tool, content creators can place points of interest (locations) on a geographical map and link other H5P activities to each of these points.

When a user clicks on a map marker or selects it from the sidebar list, the associated H5P content is displayed immediately inside a modal dialog window.

---

## 🚀 Key Features

* **Interactive Map (Leaflet):** Uses Leaflet with layer selection controls (Default Map, Satellite, and Topographic layers).
* **H5P Activity Binding:** Support for attaching other H5P libraries to markers (e.g., *H5P.AdvancedText*, *H5P.Image*, *H5P.Video*, *H5P.MultiChoice*, *H5P.TrueFalse*, etc.).
* **Dynamic Locations List:** A sidebar panel featuring instant search and quick marker navigation.
* **Responsive Layout:**
  * On **Desktop**, the sidebar "pushes" the map container, splitting the horizontal space cleanly.
  * On **Mobile**, the sidebar overlaps the map as a floating panel to optimize mobile screen real estate.
* **Custom Marker Design:** Options to upload custom marker icons, define dimensions, configure shadows, and specify anchor points through the author's interface.

---

## 🛠️ How to Use in the H5P Editor

1. **Configure Marker Icon (Optional):** Upload an image file to act as the map marker and customize its dimensions (width, height, anchors).
2. **Add Map Points:**
   * Provide a title for the location.
   * Define the location's latitude and longitude coordinates using the visual point selector widget.
   * Choose the desired H5P sub-library under the **Interactive content** field and configure the activity that will be displayed in the modal.
3. **Restrict Navigation:** Enable the map restriction setting to lock the map view bounds, preventing users from panning away from the area containing the markers.
