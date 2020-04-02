let seed = 1;
function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function inBounds(point, bounds) {
    var eastBound = point.lng < bounds._northEast.lng;
    var westBound = point.lng > bounds._southWest.lng;
    var inLong;

    if (bounds._northEast.lng < bounds._southWest.lng) {
        inLong = eastBound || westBound;
    } else {
        inLong = eastBound && westBound;
    }

    var inLat = point.lat > bounds._southWest.lat && point.lat < bounds._northEast.lat;
    return inLat && inLong;
}

let curMapBounds = null;
let curZoom = 5;
const m = L.map('mapbox',
    {
        center: [32.42791, 53.688046],
        crs: L.CRS.EPSG3857,
        zoom: 5,
        zoomControl: true,
        preferCanvas: false
    });

L.tileLayer(
    "https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png",
    {"attribution": "\u0026copy; \u003ca href=\"http://www.openstreetmap.org/copyright\"\u003eOpenStreetMap\u003c/a\u003e contributors \u0026copy; \u003ca href=\"http://cartodb.com/attributions\"\u003eCartoDB\u003c/a\u003e, CartoDB \u003ca href =\"http://cartodb.com/attributions\"\u003eattributions\u003c/a\u003e", "detectRetina": false, "maxNativeZoom": 18, "maxZoom": 18, "minZoom": 1, "noWrap": false, "opacity": 1, "subdomains": "abc", "tms": false}
).addTo(m);

//get geoJson data
countryBoundryStyle =  {"color": "black", "fillColor": "#fefea0", "weight": 2};
$.getJSON("geojson/iran.geojson",function (data) {
    L.geoJSON(data,{
        style: countryBoundryStyle
    }).addTo(m);
});

m.on("moveend", (e) => {
    // updates always after map has been moved
    curMapBounds = m.getBounds();
    if(curZoom !== m.getZoom()) {
        //zoom changed
        if(curZoom<7 && m.getZoom() >=7) reflectOnMap();
        if(curZoom>=7 && m.getZoom() <7) reflectOnMap();
        if(curZoom<9 && m.getZoom() >=9) reflectOnMap();
        if(curZoom>=9 && m.getZoom() <9) reflectOnMap();
        curZoom = m.getZoom();
    }
});

let coordinates = null;
let circlesLayer = null;

function reflectOnMap() {
    if(coordinates == null) return;
    if(circlesLayer != null && m.hasLayer(circlesLayer)) {
        m.removeLayer(circlesLayer);
    }
    circlesLayer = L.featureGroup();

    let sampleSize = 4000;
    let useSampling = true;
    let radius = 1;

    if(m.getZoom() >= 7) {
        useSampling = true;
        sampleSize = 8000;
        radius = 2;
    }
    if(m.getZoom() >= 10) {
        useSampling = false;
        radius = 10;
    }

    let coordinateSamples = null;
    if(useSampling) {
        seed = 1;
        coordinateSamples = coordinates
            .map(x => ({ x, r: random() }))
            .sort((a, b) => a.r - b.r)
            .map(a => a.x)
            .slice(0, sampleSize);
    }
    else {
        coordinateSamples = coordinates;
    }

    for(let c=0; c<coordinateSamples.length; c++) {
        if(isNaN(coordinateSamples[c][0]) || isNaN(coordinateSamples[c][1])) continue;
        L.circle(coordinateSamples[c],
            {"color": "red",
                "dashArray": null,
                "dashOffset": null,
                "fill": true,
                "fillColor": "red",
                "fillOpacity": 1,
                "fillRule": "evenodd",
                "lineCap": "round",
                "lineJoin": "round",
                "opacity": 1.0,
                "radius": radius,
                "stroke": true,
                "weight": radius}).addTo(circlesLayer);
    }
    m.addLayer(circlesLayer);
    console.log("reflected !");
}

function processData(allText) {
    coordinates = [];
    const allTextLines = allText.split(/\r\n|\n/);
    for(let i=0; i<allTextLines.length; i++) {
        const data = allTextLines[i].split(',');
        if(data.length > 0) {
            coordinates.push([parseFloat(data[1]),parseFloat(data[2])]);
        }
    }
    reflectOnMap();
}

//get coordinates
$.get("data/covid_data_136.csv", function (data) {processData(data)}, "text");
