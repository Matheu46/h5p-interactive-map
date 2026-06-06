H5P.InteractiveMap = (function ($) {

  function MapManager(params, contentId) {
    this.params = params;

    // Configuração dos textos traduzíveis (i18n) com valores padrão (inglês)
    this.params.l10n = $.extend({
      searchPlaceholder: 'Type the location name',
      resetViewButton: 'View all locations',
      modalAriaLabel: 'Interactive map content',
      closeButtonAriaLabel: 'Close',
      noInteractiveContent: 'No interactive content has been configured for this point.',
      noResultsMessage: 'No locations found.',
      layerMapDefault: 'Map (Default)',
      layerSatellite: 'Satellite',
      layerTopographic: 'Topographic'
    }, this.params.l10n || {});

    this.contentId = contentId;
    this.markers = [];
    this.map = null;
    this.mapBounds = null;
    this.currentRunnable = null;
  }

  /** Utilitário para converter "num1,num2" em [num1, num2] */
  MapManager.parseCoordinate = function (value, defaultValue) {
    if (value) {
      const parts = value.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && parts.every(n => !isNaN(n))) {
        return parts;
      }
    }
    return defaultValue;
  };

  /** 1. Prepara o container do mapa e da sidebar */
  MapManager.prototype.setupContainer = function ($container) {
    this.$container = $container;
    this.container = $container.get(0);

    $container.addClass('h5p-interactive-map');

    // Sidebar
    const sidebar = `
      <aside class="locations-sidebar">
        <div id="search-container">
          <input type="text" id="search-input" placeholder="${this.params.l10n.searchPlaceholder}">
          <button id="clear-search" style="display:none">&times;</button>
        </div>
        <div id="locations-list-items"></div>
      </aside>
      <button id="toggle-sidebar" class="toggle-sidebar-button">«</button>
      <button id="reset-view" class="reset-view-button">${this.params.l10n.resetViewButton}</button>
    `;
    $container.append(sidebar);

    // Mapa
    this.mapId = 'h5p-map-' + this.contentId;
    $container.append(`<div id="${this.mapId}" class="h5p-map-container"></div>`);


    const modal = `
      <div class="interactive-map-modal" aria-hidden="true">
        <div class="interactive-map-modal__backdrop"></div>
        <div class="interactive-map-modal__dialog" role="dialog" aria-modal="true" aria-label="${this.params.l10n.modalAriaLabel}">
          <button type="button" class="interactive-map-modal__close" aria-label="${this.params.l10n.closeButtonAriaLabel}">×</button>
          <div class="interactive-map-modal__content"></div>
        </div>
      </div>
    `;
    $container.append(modal);

    this.$list = this.container.querySelector('#locations-list-items');
    this.$modal = $container.find('.interactive-map-modal');
    this.$modalContent = $container.find('.interactive-map-modal__content');
    this.$modalClose = $container.find('.interactive-map-modal__close');
    this.$modalBackdrop = $container.find('.interactive-map-modal__backdrop');
  };

  /** 2. Inicializa o mapa Leaflet com camada OSM */
  MapManager.prototype.initMap = function () {
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    });

    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri'
    });

    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
    });

    this.map = L.map(this.mapId, {
      zoomControl: false,
      layers: [osm]
    }).setView([0, 0], 2);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.map);

    const baseMaps = {};
    baseMaps[this.params.l10n.layerMapDefault] = osm;
    baseMaps[this.params.l10n.layerSatellite] = satellite;
    baseMaps[this.params.l10n.layerTopographic] = topo;

    L.control.layers(baseMaps, null, {
      position: 'bottomright'
    }).addTo(this.map);
  };

  /** 3. Construir opções de ícone customizado, se houver */
  MapManager.prototype.getMarkerOptions = function () {
    const opts = {};
    const cfg = this.params.iconSettings;
    if (cfg && cfg.icon) {
      const path = H5P.getPath;
      const base = cfg.icon.path;
      const iconUrl = path(base, this.contentId);
      const shadowUrl = cfg.shadowUrl ? path(cfg.shadowUrl.path, this.contentId) : null;

      opts.icon = L.icon({
        iconUrl,
        shadowUrl,
        iconSize: MapManager.parseCoordinate(cfg.iconSize, [25, 41]),
        iconAnchor: MapManager.parseCoordinate(cfg.iconAnchor, [12, 41]),
        popupAnchor: MapManager.parseCoordinate(cfg.popupAnchor, [1, -34]),
        shadowSize: MapManager.parseCoordinate(cfg.shadowSize, [41, 41])
      });
    }
    return opts;
  };

  MapManager.prototype.openMarkerContent = function (point) {
    const interactiveContent = point && point.interactiveContent;

    this.closeModal();
    this.$modalContent.empty();
    this.$modal.addClass('is-open').attr('aria-hidden', 'false');

    if (!interactiveContent || !interactiveContent.library || !interactiveContent.params) {
      this.$modalContent.append('<div class="interactive-map-modal__empty">' + this.params.l10n.noInteractiveContent + '</div>');
      if (typeof this.trigger === 'function') {
        this.trigger('resize');
      }
      return;
    }

    this.currentRunnable = H5P.newRunnable(
      interactiveContent,
      this.contentId,
      this.$modalContent,
      true
    );

    if (this.currentRunnable && typeof this.currentRunnable.trigger === 'function') {
      this.currentRunnable.trigger('resize');
    }
    else if (this.currentRunnable) {
      H5P.trigger(this.currentRunnable, 'resize');
    }

    if (typeof this.trigger === 'function') {
      this.trigger('resize');
    }
  };

  MapManager.prototype.closeModal = function () {
    if (this.currentRunnable && typeof this.currentRunnable.pause === 'function') {
      this.currentRunnable.pause();
    }

    this.currentRunnable = null;

    if (this.$modalContent) {
      this.$modalContent.empty();
    }

    if (this.$modal) {
      this.$modal.removeClass('is-open').attr('aria-hidden', 'true');
    }

    document.querySelectorAll('.location-item.active').forEach(el => {
      el.classList.remove('active');
    });

    if (typeof this.trigger === 'function') {
      this.trigger('resize');
    }
  };

  /** 4. Add markers to the map and store references */
  MapManager.prototype.addMarkers = function () {
    const self = this;
    const options = this.getMarkerOptions();
    const group = L.featureGroup();

    (this.params.mapPoints || []).forEach(point => {
      const { location } = point;
      const lat = location ? location.latitude : null;
      const lng = location ? location.longitude : null;
      if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
        const m = L.marker([lat, lng], options);

        // Show the point title on hover to improve map discoverability.
        if (point.title) {
          m.bindTooltip(point.title, {
            direction: 'top',
            offset: [-14, -15]
          });
        }

        m.on('click', function () {
          // Center the map on the marker before opening the modal content.
          self.map.flyTo([lat, lng], 14, {
            animate: true,
            duration: 1.2
          });

          // Delay modal opening so the fly animation remains visible.
          window.setTimeout(function () {
            if (m._linkedListItem) {
              self.sidebarItems.forEach(el => el.classList.remove('active'));
              m._linkedListItem.classList.add('active');
            }
            self.openMarkerContent(point);
          }, 1000);
        });
        group.addLayer(m);
        this.markers.push({ marker: m, point });
      }
    });

    if (group.getLayers().length > 0) {
      group.addTo(this.map);
      this.mapBounds = group.getBounds();

      const fitBoundsOptions = {
        padding: [30, 30]
      };

      this.map.fitBounds(this.mapBounds, fitBoundsOptions);

      if (this.params.restrictNavigation) {
        const restrictedBounds = this.mapBounds.pad(0.2);

        this.map.setMaxBounds(restrictedBounds);
        this.map.setMinZoom(this.map.getZoom());
      }
    }
  };


  /** 5. Preenche a lista lateral e conecta eventos */
  MapManager.prototype.buildSidebar = function () {
    const zoomOnClick = 14;
    this.sidebarItems = [];

    this.markers.forEach(({ marker, point }) => {
      const item = document.createElement('div');
      item.className = 'location-item';
      item.textContent = point.title;

      // Evento de clique no item da lista
      item.addEventListener('click', () => {
        // SE FOR MOBILE, recolhe a sidebar
        if (window.innerWidth <= 768) {
          const sidebar = this.container.querySelector('.locations-sidebar');
          const toggleBtn = this.container.querySelector('#toggle-sidebar');
          if (sidebar && toggleBtn && !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            toggleBtn.textContent = '»';
          }
        }

        // Delay modal opening so the fly animation remains visible.
        if (point.location) {
          this.map.flyTo([point.location.latitude, point.location.longitude], zoomOnClick, {
            animate: true,
            duration: 1.2
          });

          window.setTimeout(() => {
            this.sidebarItems.forEach(el => el.classList.remove('active'));
            this.openMarkerContent(point);
            item.classList.add('active');
          }, 1000);
        }
        else {
          this.sidebarItems.forEach(el => el.classList.remove('active'));
          item.classList.add('active');
          this.openMarkerContent(point);
        }
      });

      // Guardar referência cruzada
      marker._linkedListItem = item;

      this.sidebarItems.push(item);
      this.$list.appendChild(item);
    });

    const noResults = document.createElement('div');
    noResults.className = 'no-results-message';
    noResults.textContent = this.params.l10n.noResultsMessage;
    noResults.style.display = 'none';

    this.$list.parentNode.appendChild(noResults);
    this.noResults = noResults;

    const searchInput = this.container.querySelector('#search-input');
    const clearButton = this.container.querySelector('#clear-search');

    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      let visibleCount = 0;

      this.sidebarItems.forEach(item => {
        const matches = item.textContent.toLowerCase().includes(searchTerm);
        item.style.display = matches ? 'block' : 'none';
        if (matches) visibleCount++;
      });

      clearButton.style.display = searchTerm ? 'inline-block' : 'none';
      this.noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    });

    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      clearButton.style.display = 'none';
      this.sidebarItems.forEach(item => (item.style.display = 'block'));
      this.noResults.style.display = 'none';
    });

    // Retornar ao zoom padrão
    const resetButton = this.container.querySelector('#reset-view');
    resetButton.addEventListener('click', () => {
      if (this.mapBounds) {
        this.map.flyToBounds(this.mapBounds, {
          duration: 1.2,
          padding: [30, 30]
        });
        return;
      }

      this.map.flyTo([0, 0], 2, {
        animate: true,
        duration: 1.2
      });
    });

    const toggleSidebar = this.container.querySelector('#toggle-sidebar');
    toggleSidebar.addEventListener('click', () => {
      const sidebar = this.container.querySelector('.locations-sidebar');
      sidebar.classList.toggle('collapsed');

      const toggleBtn = this.container.querySelector('#toggle-sidebar');
      toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '»' : '«';

      // Atualiza o tamanho do mapa para o Leaflet durante e após a animação
      if (this.map) {
        const interval = setInterval(() => {
          this.map.invalidateSize();
        }, 30);
        setTimeout(() => {
          clearInterval(interval);
          this.map.invalidateSize();
        }, 350); // um pouco mais que os 0.3s da transição CSS
      }
    });

    this.$modalClose.on('click', () => {
      this.closeModal();
    });

    this.$modalBackdrop.on('click', () => {
      this.closeModal();
    });

  };

  /** 6. Entry point chamado pelo H5P para inserir o conteúdo */
  MapManager.prototype.attach = function ($container) {
    this.setupContainer($container);
    this.initMap();
    this.addMarkers();
    this.buildSidebar();
  };

  return MapManager;

})(H5P.jQuery);
