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
        url: 'wss://macbeth.ce.unipr.it:3002',
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
        upper_limit: 20,
        lower_limit: 1,
        radius: 2000
    },
    discovery: {
        period: 15000,
        request_limit: 20,
        response_limit: 20
    }
};

document.getElementById('map-button').onclick = function() {
    document.getElementById('chat').style.display = 'none';
    document.getElementById('map').style.display = 'block';

    document.getElementById('map-button').style.backgroundColor = '#FFFFFF';
    document.getElementById('map-button').disabled = true;
    document.getElementById('map-button').style.cursor = 'not-allowed';
    document.getElementById('chat-button').style.backgroundColor = '#C1C1C1';
    document.getElementById('chat-button').disabled = false;
    document.getElementById('chat-button').style.cursor = 'pointer';
};

document.getElementById('chat-button').onclick = function() {
    document.getElementById('chat').style.display = 'block';
    document.getElementById('map').style.display = 'none';
    document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;

    document.getElementById('chat-button').style.backgroundColor = '#FFFFFF';
    document.getElementById('chat-button').disabled = true;
    document.getElementById('chat-button').style.cursor = 'not-allowed';
    document.getElementById('map-button').style.backgroundColor = '#C1C1C1';
    document.getElementById('map-button').disabled = false;
    document.getElementById('map-button').style.cursor = 'pointer';
};

var messages = new Map();
var peer = new Peer(options);

var map = L.map('map', {zoomControl:false}).setView([peer.descriptor.position.coords.latitude, peer.descriptor.position.coords.longitude], 14);

var tileLayer = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
    maxZoom: 18,
    attribution: '<a href="http://openstreetmap.org">OpenStreetMap</a>',
    id: 'mapbox.streets'
}).addTo(map);

var icon_peer_blue = L.icon({
    iconUrl: 'img/marker_blue.png'
});

var icon_peer_heading_blue = L.icon({
    iconUrl: 'img/marker_heading_blue.png'
});

var icon_peer_red = L.icon({
    iconUrl: 'img/marker_red.png'
});

var icon_peer_heading_red = L.icon({
    iconUrl: 'img/marker_heading_red.png'
});

var icon_message = L.icon({
    iconUrl: 'img/message.png'
});

var marker = L.marker([peer.descriptor.position.coords.latitude, peer.descriptor.position.coords.longitude], {
    rotationAngle: 0,
    icon: icon_peer_red
}).addTo(map);

if(peer.descriptor.position.coords.speed > 0) {
    marker.setIcon(icon_peer_heading_red);
    marker.setRotationAngle(peer.descriptor.position.coords.heading);
}

var peer_markers = L.layerGroup().addTo(map);

peer.on("neighbors", function(descriptors) {
    peer_markers.clearLayers();
    for(var id of messages.keys()) {
        forward(id);
    }
    for(var index in descriptors) {
        var descriptor = descriptors[index];
        if(descriptor.position.coords.speed > 0) {
            peer_markers.addLayer(L.marker([descriptor.position.coords.latitude, descriptor.position.coords.longitude], {
                rotationAngle: descriptor.position.coords.heading,
                icon: icon_peer_heading_blue
            }).bindPopup(descriptor.key));
        } else {
            peer_markers.addLayer(L.marker([descriptor.position.coords.latitude, descriptor.position.coords.longitude], {
                rotationAngle: descriptor.position.coords.heading,
                icon: icon_peer_blue
            }).bindPopup(descriptor.key));
        }
    }
});

document.getElementById("text").onkeypress = function(event) {
    if (event.keyCode == 13) {
        document.getElementById('send-button').click();
    }
};

document.getElementById('send-button').onclick = function() {
    var text = document.getElementById('text').value;
    if(text) {
        var id = Math.random().toString().replace('.', '') + '@' + peer.descriptor.key;
        var coords = peer.descriptor.position.coords;
        var descriptors = new Set();
        var now = new Date();
        for(var descriptor of peer.geobucket.descriptors()) {
            descriptors.add(descriptor.key);
        }

        messages.set(id, {id: id, creator:peer.descriptor.key, coords: coords, text: text, descriptors: descriptors, time: now.getTime()});


        var popup;
        if(text.length < 30) {
            popup = text;
        } else {
            popup = text.substring(0, 30) + '…';
        }
        L.marker([coords.latitude, coords.longitude], {
            icon: icon_message
        }).addTo(map).bindPopup(popup);

        peer.geocast({id: id, creator:peer.descriptor.key, coords: coords, text:text, time: now.getTime()});

        tracking('S', id);

        document.getElementById('text').value = '';
        document.getElementById('chat').insertAdjacentHTML('beforeend', '<p class="me">[' + peer.descriptor.key + '] ' + text + ' (' + printTime(now) + ')</p>');
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
    }
};

peer.on("data", function(descriptor, data) {
    if(!messages.has(data.id)) {
        var id = data.id;
        var text = data.text;
        var coords = data.coords;
        var creator = data.creator;
        var descriptors = new Set();
        var date = new Date(data.time);
        descriptors.add(descriptor.key);
        messages.set(id, {id: id, creator:creator, coords: coords, text:text, descriptors: descriptors, time: date.getTime()});

        var popup;
        if(text.length < 30) {
            popup = text;
        } else {
            popup = text.substring(0, 30) + '…';
        }
        L.marker([coords.latitude, coords.longitude], {
            icon: icon_message
        }).addTo(map).bindPopup(popup);

        forward(id);

        tracking('R', id);

        document.getElementById('chat').insertAdjacentHTML('beforeend', '<p class="them">[' + creator + '] ' + text + ' (' + printTime(date) + ')</p>');
        document.getElementById('chat').scrollTop = document.getElementById('chat').scrollHeight;
    }
});

peer.connect();

navigator.geolocation.watchPosition(function(position) {
    peer.move(position);
    marker.setLatLng(L.latLng(position.coords.latitude, position.coords.longitude));
    if(position.coords.speed > 0) {
        marker.setIcon(icon_peer_heading_red);
    } else {
        marker.setIcon(icon_peer_red);
    }
    marker.setRotationAngle(position.coords.heading);
    map.panTo(L.latLng(position.coords.latitude, position.coords.longitude));
    
    tracking('U', null);
});

function printTime(date) {
  var hours = date.getHours();
  if(hours < 10) {
    hours = '0' + hours;
  }
  var minutes = date.getMinutes();
  if(minutes < 10) {
    minutes = '0' + minutes;
  }
  var seconds = date.getSeconds();
  if(seconds < 10) {
    seconds = '0' + seconds;
  }
  return hours + ':' + minutes + ':' + seconds;
}

function forward(id) {
    var recipients = new Set();
    for(var neighbor of peer.geobucket.descriptors()) {
        if(neighbor.key != messages.get(id).creator) {
            if(Geography.distance(messages.get(id).coords.latitude, messages.get(id).coords.longitude, neighbor.position.coords.latitude, neighbor.position.coords.longitude) <= 2 * options.geobucket.radius) {
                if(!messages.get(id).descriptors.has(neighbor.key)) {
                    recipients.add(neighbor);
                }
            }
        }
    }

    for(var recipient of recipients) {
        messages.get(id).descriptors.add(recipient.key);
        peer.send({id: messages.get(id).id, creator: messages.get(id).creator, coords: messages.get(id).coords, text: messages.get(id).text, time: messages.get(id).time}, recipient);
    }
}

function tracking(type, body) {
    peer.bootstrappingNode.send({sender: peer.descriptor, type: 'TRACKING', payload:{type: type, body: body}});
}
