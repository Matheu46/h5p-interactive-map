H5P.InteractiveMap = (function($) {
  function MapManager(params, contentId) {
    var self = this;
    this.params = params;
    this.contentId = contentId;
  };

  MapManager.prototype.attach = function ($container) {
    var self = this;

    // Criar container do mapa
    $container.addClass("h5p-interactive-map");
    var mapId = "h5p-map-" + this.contentId;
    $container.append('<div id="' + mapId + '" class="h5p-map-container"></div>');
    console.log("Content ID:", this.contentId);

    // Pegar configurações iniciais do mapa
    var centerLat = this.params.defaultLatitude;
    var centerLng = this.params.defaultLongitude;
    var zoomLevel = this.params.defaultZoom;

    // Inicializar Leaflet.js
    var map = L.map(mapId).setView([centerLat, centerLng], zoomLevel);

    // Adicionar camada de mapa (OpenStreetMap)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    console.log(this.params.mapPoints)

    // Adicionar os pontos ao mapa
    if (this.params.mapPoints && this.params.mapPoints.length > 0) {
      this.params.mapPoints.forEach(function (point) {
        if (point.latitude && point.longitude) {
          var marker = L.marker([point.latitude, point.longitude]).addTo(map);
          marker.bindPopup("<b>" + point.title + "</b><br>" + point.description);
        }
      });
    }
  };

  return MapManager;
})(H5P.jQuery);