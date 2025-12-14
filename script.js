// Variabelen voor de kaart en data
const map = L.map('map').setView([50.85, 4.35], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const markers = L.markerClusterGroup({ spiderfyOnMaxZoom: true });
let fullGeoJsonData = null; // Opslag voor de ruwe data
let geoJsonLayer = null;    // De actieve Leaflet laag

// Definieer de kleuren voor de legenda
const nodeColors = {
    'Person': '#E91E63', // Roze voor Personen
    'City': '#3388ff',   // Blauw voor Plaatsen
    // Voeg hier meer types en kleuren toe indien nodig
};

// Functie om de HTML voor de relatiepopup te genereren
function generatePopupHtml(props) {
    let popupHtml = `<div class="node-popup">
        <h3>${props.label}</h3>
        <p><b>Type:</b> ${props.type}</p>
        <hr>
        <b>Relaties (${props.relations ? props.relations.length : 0}):</b><br>
        <ul style="max-height: 150px; overflow-y: auto; padding-left: 20px;">`;

    if (props.relations && props.relations.length > 0) {
        props.relations.forEach(rel => {
            // Gebruik een Font Awesome icoon om de richting aan te geven
            const icon = rel.dir === "naar" ? '<i class="fas fa-arrow-right"></i>' : '<i class="fas fa-arrow-left"></i>';
            popupHtml += `<li>${icon} <i>${rel.rel}</i> <b>${rel.target}</b></li>`;
        });
    } else {
        popupHtml += "<li>Geen directe relaties gevonden.</li>";
    }
    popupHtml += `</ul></div>`;
    return popupHtml;
}

// Functie om de kaartlaag te tekenen
function drawMap(data) {
    // 1. Verwijder de oude lagen (zowel markers als lijnen)
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
    }
    markers.clearLayers();

    // 2. Filter de data om alleen de getoonde features te bevatten
    const filteredFeatures = data.features.filter(f => f.visible);

    // 3. Teken de nieuwe laag
    geoJsonLayer = L.geoJSON({
        type: 'FeatureCollection',
        features: filteredFeatures
    }, {
        pointToLayer: (feature, latlng) => {
            if (feature.geometry.type === 'Point') {
                const props = feature.properties;
                const color = nodeColors[props.type] || '#888';
                
                const marker = L.circleMarker(latlng, {
                    radius: 7,
                    fillColor: color,
                    color: "#000",
                    weight: 1,
                    fillOpacity: 0.8
                });

                marker.bindPopup(generatePopupHtml(props), { minWidth: 250 });
                markers.addLayer(marker);
                return null; // Voeg het niet toe aan de geoJsonLayer, maar aan de markers
            }
            return null;
        },
        style: (feature) => {
            if (feature.geometry.type === 'LineString') {
                // Lijnen zijn dun en lichtgrijs voor overzicht, alleen in de hoofdlaag
                return { color: '#888', weight: 1, opacity: 0.3 };
            }
        }
    });

    // Voeg de lagen toe aan de kaart en pas de weergave aan
    map.addLayer(markers);
    geoJsonLayer.addTo(map);

    if (filteredFeatures.length > 0) {
         // Probeer de markers te fitten, zo niet, fit de totale laag
        const bounds = markers.getBounds().isValid() ? markers.getBounds() : geoJsonLayer.getBounds();
        if (bounds.isValid()) {
             map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
}

// Functie voor filteren en zoeken
window.filterMap = function() {
    if (!fullGeoJsonData) return;

    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filterType = document.getElementById('filter-type').value;

    // Clone de data om aanpassingen te maken
    const filteredData = JSON.parse(JSON.stringify(fullGeoJsonData));

    filteredData.features.forEach(feature => {
        feature.visible = true; // Standaard tonen
        const props = feature.properties;

        if (feature.geometry.type === 'Point') {
            // 1. Zoekfilter
            const label = props.label ? props.label.toLowerCase() : '';
            if (searchTerm && !label.includes(searchTerm)) {
                feature.visible = false;
            }

            // 2. Typefilter
            if (feature.visible && filterType !== 'all' && props.type !== filterType) {
                feature.visible = false;
            }

        } else if (feature.geometry.type === 'LineString') {
            // Lijnen moeten alleen zichtbaar zijn als BEIDE knooppunten zichtbaar zijn.
            // Omdat we in deze simpele implementatie de knopen en lijnen niet perfect linken tijdens het filteren,
            // verbergen we lijnen simpelweg niet bij het filteren van knooppunten. 
            // Een geavanceerdere aanpak zou vereist zijn, maar voor nu houden we ze zichtbaar.
        }
    });

    drawMap(filteredData);
};

// Functie om de legenda te vullen
function createLegend() {
    const legendContent = document.getElementById('legend-content');
    let html = '<h4>Knooppunten (Locaties/Personen)</h4>';

    for (const type in nodeColors) {
        html += `<div style="display: flex; align-items: center; margin-bottom: 5px;">
            <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${nodeColors[type]}; border: 1px solid #000; margin-right: 8px;"></span>
            <span>${type}</span>
        </div>`;
    }
    
    html += '<h4 style="margin-top: 15px;">Lijnen (Relaties)</h4>';
    html += `<div style="display: flex; align-items: center;">
        <span style="display: inline-block; width: 30px; height: 2px; background-color: #888; margin-right: 8px;"></span>
        <span>Aangetoonde relatie</span>
    </div>`;

    legendContent.innerHTML = html;
}

// Start de applicatie door de data te laden
fetch('network_data_with_relations.geojson')
    .then(res => res.json())
    .then(data => {
        fullGeoJsonData = data;
        
        // Initialiseer de 'visible' eigenschap voor alle features
        fullGeoJsonData.features.forEach(f => f.visible = true);
        
        drawMap(fullGeoJsonData);
        createLegend();
    })
    .catch(error => {
        console.error('Fout bij het laden van de GeoJSON data:', error);
        alert('Kan data niet laden. Controleer de browser console (F12).');
    });
