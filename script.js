// Variabelen voor de kaart en data
const map = L.map('map').setView([50.85, 4.35], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// MarkerClusterGroup is de oplossing voor overlappende bolletjes, 
// maar u wilt 'spiderfication' (uitspreiden) zien als u inzoomt
// (spiderfyOnMaxZoom: true zorgt daarvoor).
const markers = L.markerClusterGroup({ 
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
});

let fullGeoJsonData = null; // Opslag voor de ruwe data
let geoJsonLayer = null;    // De actieve Leaflet laag

// Definieer de kleuren voor de legenda
const nodeColors = {
    'Person': '#E91E63', // Roze voor Personen
    'City': '#3388ff',   // Blauw voor Plaatsen
    // Voeg hier meer types en kleuren toe indien nodig
};

// --- FUNCTIES VOOR INTERACTIE ---

// Functie om de HTML voor de relatiepopup te genereren (Knoop klik)
function generateNodePopupHtml(props) {
    let popupHtml = `<div class="node-popup">
        <h3>${props.label}</h3>
        <p><b>Type:</b> ${props.type}</p>
        <hr>
        <b>Relaties (${props.relations ? props.relations.length : 0}):</b><br>
        <ul style="max-height: 150px; overflow-y: auto; padding-left: 20px;">`;

    // Sorteer relaties op richting (in/uitgaand) voor overzicht
    const sortedRelations = props.relations.sort((a, b) => a.dir.localeCompare(b.dir));

    if (sortedRelations && sortedRelations.length > 0) {
        sortedRelations.forEach(rel => {
            // "van" betekent inkomend, "naar" betekent uitgaand
            const directionText = rel.dir === "naar" ? 'gaat naar' : 'komt van';
            const icon = rel.dir === "naar" ? '<i class="fas fa-arrow-right"></i>' : '<i class="fas fa-arrow-left"></i>';
            popupHtml += `<li>${icon} ${rel.rel} ${directionText} <b>${rel.target}</b></li>`;
        });
    } else {
        popupHtml += "<li>Geen directe relaties gevonden.</li>";
    }
    popupHtml += `</ul></div>`;
    return popupHtml;
}

// Functie om de popup voor een Lijn te genereren (Lijn klik)
function generateLinePopupHtml(props) {
     return `
        <h3>Relatie Detail</h3>
        <p><b>Type:</b> ${props.relationship}</p>
        <p><b>Van:</b> ${props.source_label || props.source_id}</p>
        <p><b>Naar:</b> ${props.target_label || props.target_id}</p>
    `;
}

// Algemene functie voor popups op alle GeoJSON features
function onEachFeature(feature, layer) {
    if (feature.geometry.type === 'LineString') {
        // Alleen lijnen binden aan de geoJsonLayer
        layer.bindPopup(generateLinePopupHtml(feature.properties), { minWidth: 200 });
    }
    // Punten worden al behandeld in pointToLayer en de clustergroep
}


// --- FUNCTIES VOOR KAART WEERGAVE EN FILTERING ---

function drawMap(data) {
    // 1. Verwijder de oude lagen
    if (geoJsonLayer) {
        map.removeLayer(geoJsonLayer);
    }
    markers.clearLayers();

    // 2. Filter de data om alleen de features te tonen die 'visible' zijn
    const filteredFeatures = data.features.filter(f => f.visible);

    // 3. Teken de nieuwe laag
    geoJsonLayer = L.geoJSON({
        type: 'FeatureCollection',
        features: filteredFeatures
    }, {
        // Functie voor punten (Nodes)
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

                // Knoop-popup met relatie-lijst
                marker.bindPopup(generateNodePopupHtml(props), { minWidth: 250 });
                markers.addLayer(marker);
                return null; 
            }
            return null;
        },
        // Functie voor lijnen (Edges)
        style: (feature) => {
            if (feature.geometry.type === 'LineString') {
                return { color: '#888', weight: 1, opacity: 0.3 };
            }
            return {};
        },
        // Bind de popup aan de lijnen
        onEachFeature: onEachFeature 
    });

    // Voeg de lagen toe aan de kaart
    map.addLayer(markers);
    geoJsonLayer.addTo(map);

    // Pas de weergave aan
    if (markers.getLayers().length > 0) {
         map.fitBounds(markers.getBounds(), { padding: [50, 50] });
    } else if (geoJsonLayer.getLayers().length > 0) {
        map.fitBounds(geoJsonLayer.getBounds(), { padding: [50, 50] });
    }
}

// Functie voor filteren en zoeken (onveranderd)
window.filterMap = function() {
    if (!fullGeoJsonData) return;

    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filterType = document.getElementById('filter-type').value;

    const filteredData = JSON.parse(JSON.stringify(fullGeoJsonData));

    filteredData.features.forEach(feature => {
        feature.visible = true;
        const props = feature.properties;

        if (feature.geometry.type === 'Point') {
            const label = props.label ? props.label.toLowerCase() : '';
            
            if (searchTerm && !label.includes(searchTerm)) {
                feature.visible = false;
            }

            if (feature.visible && filterType !== 'all' && props.type !== filterType) {
                feature.visible = false;
            }
        } else if (feature.geometry.type === 'LineString') {
            // Lijnen blijven altijd zichtbaar in deze versie, tenzij hun nodes zijn gefilterd in Python
            // Voor nu houden we de simpele benadering: verberg de lijn niet op basis van de JS filters.
        }
    });

    drawMap(filteredData);
};

// Functie om de legenda te vullen (onveranderd)
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

// Start de applicatie
fetch('network_data_with_relations.geojson')
    .then(res => res.json())
    .then(data => {
        fullGeoJsonData = data;
        fullGeoJsonData.features.forEach(f => f.visible = true);
        
        drawMap(fullGeoJsonData);
        createLegend();
    })
    .catch(error => {
        console.error('Fout bij het laden van de GeoJSON data:', error);
    });
