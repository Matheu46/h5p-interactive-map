H5P.InteractiveMap = (function ($) {

  function MapManager(params, contentId) {
    this.params = params;
    this.contentId = contentId;
    this.markers = [];
    this.map = null;
    this.mapBounds = null;
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
    $container.addClass('h5p-interactive-map');

    // Mapa
    this.mapId = 'h5p-map-' + this.contentId;
    $container.append(`<div id="${this.mapId}" class="h5p-map-container"></div>`);

    // Sidebar
    const sidebar = `
      <aside class="polos-sidebar">
        <div id="search-container">
          <input type="text" id="search-input" placeholder="Digite o nome do polo">
          <button id="clear-search" style="display:none">&times;</button>
        </div>
        <div id="polos-list-items"></div>
      </aside>
      <button id="toggle-sidebar" class="toggle-sidebar-button">«</button>
      <button id="reset-view" class="reset-view-button">Ver todos os campi</button>
    `;
    $container.append(sidebar);
    // <div style="display: none; class="no-results-message">Nenhum campi encontrado.</div>

    // Cache de seletores
    this.$list = document.getElementById('polos-list-items');
  };

  /** 2. Inicializa o mapa Leaflet com camada OSM */
  MapManager.prototype.initMap = function () {
    this.map = L.map(this.mapId, {
      zoomControl: false
    }).setView([0, 0], 2);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  };

  /** 3. Construir opções de ícone customizado, se houver */
  MapManager.prototype.getMarkerOptions = function () {
    const opts = {};
    const cfg = this.params.iconSettings;
    if (cfg && cfg.icon) {
      const path = H5P.getPath;
      const base = cfg.icon.path;
      const iconUrl   = path(base, this.contentId);
      const shadowUrl = cfg.shadowUrl ? path(cfg.shadowUrl.path, this.contentId) : null;

      opts.icon = L.icon({
        iconUrl,
        shadowUrl,
        iconSize:   MapManager.parseCoordinate(cfg.iconSize,   [25, 41]),
        iconAnchor: MapManager.parseCoordinate(cfg.iconAnchor, [12, 41]),
        popupAnchor:MapManager.parseCoordinate(cfg.popupAnchor,[1, -34]),
        shadowSize: MapManager.parseCoordinate(cfg.shadowSize, [41, 41])
      });
    }
    return opts;
  };

  /** 4. Adiciona marcadores no mapa e armazena referências */
  MapManager.prototype.addMarkers = function () {
    const options = this.getMarkerOptions();
    const group = L.featureGroup();

    (this.params.mapPoints || []).forEach(point => {
      const { title, description, location } = point;
      const lat = location ? location.latitude : null;
      const lng = location ? location.longitude : null;
      if (lat !== null && lat !== undefined && lng !== null && lng !== undefined) {
        const m = L.marker([lat, lng], options)
                   .bindPopup(`<b>${title}</b><br>${description}`);
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
    }
  };


  /** 5. Preenche a lista lateral e conecta eventos */
  MapManager.prototype.buildSidebar = function () {
    const zoomOnClick = 14;
    this.sidebarItems = [];

    this.markers.forEach(({ marker, point }) => {
      const item = document.createElement('div');
      item.className = 'polo-item';
      item.textContent = point.title;

      // Evento de clique no item da lista
      item.addEventListener('click', () => {
        this.sidebarItems.forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        // SE FOR MOBILE, recolhe a sidebar
        if (window.innerWidth <= 768) {
          const sidebar = document.querySelector('.polos-sidebar');
          const toggleBtn = document.getElementById('toggle-sidebar');
          if (sidebar && toggleBtn && !sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            toggleBtn.textContent = '»';
          }
        }

        // Verifica se a localização existe antes de tentar acessar, evitando erros
        if (point.location) {
          this.map.flyTo([point.location.latitude, point.location.longitude], zoomOnClick, {
            animate: true, 
            duration: 1.2
          });
        }
        marker.openPopup();
      });

      // Guardar referência cruzada
      marker._linkedListItem = item;

      marker.on('popupclose', () => {
        item.classList.remove('active');
      });

      this.sidebarItems.push(item); // <- guardar para manipulação
      this.$list.appendChild(item);
    });

    const noResults = document.createElement('div');
    noResults.className = 'no-results-message';
    noResults.textContent = 'Nenhum polo encontrado.';
    noResults.style.display = 'none';

    this.$list.parentNode.appendChild(noResults);
    this.noResults = noResults; // salvar referência

    const searchInput = document.getElementById('search-input');
    const clearButton = document.getElementById('clear-search');

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
    const resetButton = document.getElementById('reset-view');
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

    const toggleSidebar = document.getElementById('toggle-sidebar');
    toggleSidebar.addEventListener('click', () => {
      const sidebar = document.querySelector('.polos-sidebar');
      sidebar.classList.toggle('collapsed');
    
      const toggleBtn = document.getElementById('toggle-sidebar');
      toggleBtn.textContent = sidebar.classList.contains('collapsed') ? '»' : '«';
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
