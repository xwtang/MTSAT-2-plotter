mapView = {};
$(function(){
//////////////////////////////////////////////////////////////////////////////

mapView.load = function(){};




var mapBounds = L.latLngBounds(
    L.latLng(-60.02, 85.02),
    L.latLng(58.98, 360-154.98)
);
var map = L.map('map', {
    maxBounds: mapBounds,
    crs: L.CRS.EPSG4326,
}).setView([20.00, 140.00], 4);

L.control.mousePosition({
    prefix: '鼠标位置:',
    separator: ' / ',
    emptyString: '在地图上移动鼠标以获取位置',

}).addTo(map);

var tileURL = "http://{s}.tile.osm.org/{z}/{x}/{y}.png";
tileURL = "http://localhost:4001/201411300032.IR1.FULL.png-split/{z}/{x}/{y}.png";
/*
http://{s}.tile.osm.org/{z}/{x}/{y}.png
*/
L.tileLayer(tileURL, {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> | ' +
        '<a href="http://www.cr.chiba-u.jp/english/">CEReS</a>, Chiba University | ' +
        '<a href="http://www.naturalearthdata.com/">Natural Earth</a>',
    maxZoom: 6,
    minZoom: 3,
}).addTo(map);


$.getJSON('./static/geojson/coastline.json', function(json){
    L.geoJson(json, {
        style: {
            'weight': '1.5px',
            'color': '#FFAA00',
            'opacity': '1.0',
        },
    }).addTo(map);
});

$.getJSON('./static/geojson/graticules.json', function(json){
    L.geoJson(json, {
        style: {
            'weight': '1.5px',
            'color': '#FFAA00',
            'opacity': '1.0',
        },
    }).addTo(map);
});

//////////////////////////////////////////////////////////////////////////////
});