H5P.InteractiveMap = (function($) {
  function MapManager(params, contentId) {
    var self = this;
    this.params = params;
    this.contentId = contentId;
  };

  // Função para converter string "num1,num2" em array [num1, num2]
  function parseCoordinate(value, defaultValue) {
    if (value) {
      var parts = value.split(',').map(function(item) {
        return parseFloat(item.trim());
      });
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return parts;
      }
    }
    return defaultValue;
  }

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

    let markerOptions = {};

    const iconSettings = this.params.iconSettings;
    if (iconSettings.icon) {
      // Cria as url's
      let iconUrl = H5P.getPath(iconSettings.icon.path, self.contentId);
      let shadowUrl = iconSettings.shadowUrl ? H5P.getPath(iconSettings.shadowUrl.path, self.contentId) : null;
      
      // Configurações padrão (se não forem informadas)
      let defaultIconSize = [25, 41];
      let defaultIconAnchor = [12, 41];
      let defaultPopupAnchor = [1, -34];
      let defaultShadowSize = [41, 41];
  
      // Se houver configurações personalizadas, faça o parse dos valores
      let iconSize = parseCoordinate(iconSettings.iconSize, defaultIconSize);
      let iconAnchor = parseCoordinate(iconSettings.iconAnchor, defaultIconAnchor);
      let popupAnchor = parseCoordinate(iconSettings.popupAnchor, defaultPopupAnchor);
      let shadowSize = parseCoordinate(iconSettings.shadowSize, defaultShadowSize);
  
      markerOptions.icon = L.icon({
        iconUrl: iconUrl,
        iconSize: iconSize,
        iconAnchor: iconAnchor,
        popupAnchor: popupAnchor,
        shadowUrl: shadowUrl,
        shadowSize: shadowSize
      });
    }

    // Adicionar os pontos ao mapa
    if (this.params.mapPoints && this.params.mapPoints.length > 0) {
      this.params.mapPoints.forEach(function (point) {
        if (point.latitude && point.longitude) {
          var marker = L.marker([point.latitude, point.longitude], markerOptions).addTo(map);
          marker.bindPopup("<b>" + point.title + "</b><br>" + point.description);
        }
      });
    }
  };

  return MapManager;
})(H5P.jQuery);