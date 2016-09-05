window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;

var iceServers;
  
$.ajax({
    url: "https://service.xirsys.com/ice",
    data: {
        ident: "brambilla",
        secret: "aa2a4a96-19bc-11e6-b226-019092d005da",
        domain: "brambilla.github.io",
        application: "default",
        room: "default",
        secure: 1
    },
    success: function (data, status) {
        iceServers = data.d.iceServers;
    },
    async: false
});

var options = {
    websocket: {
        url: 'wss://macbeth.ce.unipr.it:3000',
        protocols: 'bootstrapping'
    },
    webrtc: {
        configuration: {
            iceServers: iceServers
        },
        label: 'channel',
        datachannel_options: {
        }
    },
    geobucket: {
        upper_limit: 30,
        lower_limit: 1,
        radius: 40000
    },
    discovery: {
        period: 15000,
        request_limit: 20,
        response_limit: 20
    }
};

var peer = new Peer(options);
peer.connect();

var map = L.map('map').setView([peer.descriptor.position.coords.latitude, peer.descriptor.position.coords.longitude], 11);

var tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="http://mapbox.com">Mapbox</a>',
    id: 'mapbox.streets'
}).addTo(map);

var icon = L.icon({
    iconUrl: 'img/marker.png'
});

var icon_heading = L.icon({
    iconUrl: 'img/marker_heading.png'
});

var marker = L.marker([peer.descriptor.position.coords.latitude, peer.descriptor.position.coords.longitude], {
    rotationAngle: 0,
    icon: icon
}).addTo(map);

var markers = L.layerGroup().addTo(map);

peer.on("neighbors", function(descriptors) {
    markers.clearLayers();
    for(var index in descriptors) {
        var descriptor = descriptors[index];
        if(descriptor.position.coords.speed > 0) {
            markers.addLayer(L.marker([descriptor.position.coords.latitude, descriptor.position.coords.longitude], {
                rotationAngle: descriptor.position.coords.heading,
                icon: icon_heading
            }));
        } else {
            markers.addLayer(L.marker([descriptor.position.coords.latitude, descriptor.position.coords.longitude], {
                rotationAngle: descriptor.position.coords.heading,
                icon: icon
            }));
        }
    }
});

navigator.geolocation.watchPosition(function(position) {
    peer.move(position);
    marker.setLatLng(L.latLng(position.coords.latitude, position.coords.longitude));
    if(position.coords.speed > 0) {
        marker.setIcon(icon_heading);
    }
    marker.setRotationAngle(position.coords.heading);
    map.panTo(L.latLng(position.coords.latitude, position.coords.longitude));
});
