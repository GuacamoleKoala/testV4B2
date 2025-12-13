// Definieer de kaart. U kunt de coördinaten aanpassen naar het centrum van uw data.
// 50.85, 4.35 is ongeveer het centrum van België/Brussel. Zoomlevel 7 is goed voor regionaal.
const map = L.map('map').setView([50.85, 4.35], 7);

// Voeg de basiskaartlaag (tiles) toe van OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// De data (network_data_full_final) wordt automatisch geladen door <script> tag in HTML
// en is globaal beschikbaar als de variabele 'network_data_full_final'

// Functie om de styling van de punten (Nodes) te bepalen
function styleNodes(feature) {
    const type = feature.properties.type;
    let color = '#3388ff'; // Standaard blauw
    let radius = 6;
    
    // Pas de kleur en grootte aan op basis van het Type (Person, Country, etc.)
    if (type === 'Person') {
        color = '#E91E63'; // Roze
        radius = 4;
    } else if (type === 'Country') {
        color = '#4CAF50'; // Groen
        radius = 8;
    }
    // Voeg hier meer 'else if' toe voor andere Types uit uw data

    return {
        radius: radius,
        fillColor: color,
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
    };
}

// Functie om de styling van de lijnen (Edges) te bepalen
function styleEdges(feature) {
    const relationship = feature.properties.relationship;
    let color = '#555555';
    let weight = 1;

    // Pas de lijnstijl aan op basis van de Relatie
    if (relationship === 'In Land') {
        color = '#FF9800'; // Oranje
        weight = 2;
    }
    // Voeg hier meer logica toe voor verschillende relaties

    return {
        color: color,
        weight: weight,
        opacity: 0.8
    };
}

// Functie om popups toe te voegen wanneer op een feature wordt geklikt
function onEachFeature(feature, layer) {
    let popupContent = "";

    if (feature.geometry.type === 'Point') {
        // Knooppunt (Point)
        popupContent = `
            <b>Knooppunt:</b> ${feature.properties.label}<br>
            <b>ID:</b> ${feature.properties.id}<br>
            <b>Type:</b> ${feature.properties.type}
        `;
    } else if (feature.geometry.type === 'LineString') {
        // Rand (LineString)
        popupContent = `
            <b>Relatie:</b> ${feature.properties.relationship}<br>
            Van: ${feature.properties.source_label}<br>
            Naar: ${feature.properties.target_label}
        `;
    }
    
    layer.bindPopup(popupContent);
}

// Voeg de GeoJSON-data toe aan de kaart
L.geoJSON(network_data_full_final, {
    // Styling voor punten (Nodes)
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, styleNodes(feature));
    },
    // Styling en popups voor alle features (Nodes en Edges)
    style: styleEdges, // Wordt alleen gebruikt voor LineStrings
    onEachFeature: onEachFeature
}).addTo(map);

// Pas de kaart aan om alle data in beeld te brengen
if (network_data_full_final.features.length > 0) {
    const bounds = L.geoJSON(network_data_full_final).getBounds();
    map.fitBounds(bounds);
}
