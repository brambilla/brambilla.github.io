/**
Descriptor.js
Geography.js
Message.js
AnswerMessage.js
CandidateMessage.js
DataMessage.js
DiscoveryRequestMessage.js
DiscoveryResponseMessage.js
LeaveMessage.js
OfferMessage.js
SignalingMessage.js
UpdateMessage.js
BootstrappingNode.js
GeoBucket.js
RemoteNode.js
Peer.js
**/

function Descriptor(key, position) {
    this.key = key;
    this.position = position;
};

function Geography() {
};

/** Earth radius in metres **/
Geography.EARTH_RADIUS = function() {
    return 6370986.0;
};

/** Calculate the great-circle distance in metres between two coordinates using the haversine formula **/
Geography.distance = function(latitude1, longitude1, latitude2, longitude2) {
    const deltaLatitude = latitude1 - latitude2;
    const deltaLongitude = longitude1 - longitude2;
    const a = Math.sin((deltaLatitude * Math.PI / 180)/2) * Math.sin((deltaLatitude * Math.PI / 180)/2) + Math.sin((deltaLongitude * Math.PI / 180)/2) * Math.sin((deltaLongitude * Math.PI / 180)/2) * Math.cos(latitude1 * Math.PI / 180) * Math.cos(latitude2 * Math.PI / 180);
    return 2 * Geography.EARTH_RADIUS() * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

/** Calculate the destination coordinates given start coordinates, initial heading in degree, and distance in metres **/
Geography.destination = function(latitude, longitude, heading, distance) {
    if(distance === 0) {
        return coordinates;
    } else {
        const latitude2 = (Math.asin(Math.sin(latitude * Math.PI / 180)*Math.cos(distance/Geography.EARTH_RADIUS()) + Math.cos(latitude * Math.PI / 180)*Math.sin(distance/Geography.EARTH_RADIUS())*Math.cos(heading * Math.PI / 180))) * 180 / Math.PI;
        const longitude2 = longitude + (Math.atan2(Math.sin(heading * Math.PI / 180) * Math.sin(distance/Geography.EARTH_RADIUS()) * Math.cos(latitude * Math.PI / 180), Math.cos(distance/Geography.EARTH_RADIUS()) - Math.sin(latitude * Math.PI / 180) * Math.sin(latitude2 * Math.PI / 180))) * 180 / Math.PI;
        return {
            "latitude": latitude2,
            "longitude": longitude2,
            "heading": (Geography.heading(latitude2, longitude2, latitude, longitude) + 180) % 360
        };
    }
};

/** Calculate the initial heading given the start coordinates to the end coordinates **/
Geography.heading = function(latitude1, longitude1, latitude2, longitude2) {
    const y = Math.sin(longitude2 * Math.PI / 180 - longitude1 * Math.PI / 180) * Math.cos(latitude2 * Math.PI / 180);
    const x = Math.cos(latitude1 * Math.PI / 180)*Math.sin(latitude2 * Math.PI / 180) - Math.sin(latitude1 * Math.PI / 180)*Math.cos(latitude2 * Math.PI / 180)*Math.cos(longitude2 * Math.PI / 180 - longitude1 * Math.PI / 180);
    return (Math.atan2(y, x) * 180.0 / Math.PI + 360) % 360;
};

/** Return a mock position **/
Geography.mockPosition = function() {
    var latitude = 44.76500;
    var longitude = 10.31019;
    var heading = Math.random() * 360.0;
    var distance = Math.random() * 2000;
    var speed = Math.random()*36.11;

    var destination = Geography.destination(latitude, longitude, heading, distance);
    return {"coords":{"accuracy":0.0,"altitude":0.0,"altitudeAccuracy":0.0,"heading":destination.heading,"latitude":destination.latitude,"longitude":destination.longitude,"speed":speed},"timestamp":Date.now()};
};

function Message(sender, type) {
    this.sender = sender;
    this.type = type;
};

function AnswerMessage(sender, answer) {
    Message.call(this, sender, AnswerMessage.type());
    this.answer = answer;
};

AnswerMessage.prototype = Object.create(Message.prototype);

AnswerMessage.prototype.constructor = Message;

AnswerMessage.type = function() {
    return "ANSWER";
};

function CandidateMessage(sender, candidate) {
    Message.call(this, sender, CandidateMessage.type());
    this.candidate = candidate;
};

CandidateMessage.prototype = Object.create(Message.prototype);

CandidateMessage.prototype.constructor = Message;

CandidateMessage.type = function() {
    return "CANDIDATE";
};

function DataMessage(sender, position, data) {
    Message.call(this, sender, DataMessage.type());
    this.position = position;
    this.data = data;
};

DataMessage.prototype = Object.create(Message.prototype);

DataMessage.prototype.constructor = Message;

DataMessage.type = function() {
    return "DATA";
};

function DiscoveryRequestMessage(sender) {
    Message.call(this, sender, DiscoveryRequestMessage.type());
};

DiscoveryRequestMessage.prototype = Object.create(Message.prototype);

DiscoveryRequestMessage.prototype.constructor = Message;

DiscoveryRequestMessage.type = function() {
    return "DISCOVERY_REQUEST";
};

function DiscoveryResponseMessage(sender, descriptors) {
    Message.call(this, sender, DiscoveryResponseMessage.type());
    this.descriptors = descriptors;
};

DiscoveryResponseMessage.prototype = Object.create(Message.prototype);

DiscoveryResponseMessage.prototype.constructor = Message;

DiscoveryResponseMessage.type = function() {
    return "DISCOVERY_RESPONSE";
};

function LeaveMessage(sender) {
    Message.call(this, sender, LeaveMessage.type());
};

LeaveMessage.prototype = Object.create(Message.prototype);

LeaveMessage.prototype.constructor = Message;

LeaveMessage.type = function() {
    return "LEAVE";
};

function OfferMessage(sender, offer) {
    Message.call(this, sender, OfferMessage.type());
    this.offer = offer;
};

OfferMessage.prototype = Object.create(Message.prototype);

OfferMessage.prototype.constructor = Message;

OfferMessage.type = function() {
    return "OFFER";
};

function SignalingMessage(sender, recipient, payload) {
    Message.call(this,sender, SignalingMessage.type());
    this.recipient = recipient;
    this.payload = payload;
};

SignalingMessage.prototype = Object.create(Message.prototype);

SignalingMessage.prototype.constructor = Message;

SignalingMessage.type = function() {
    return "SIGNALING";
};

function UpdateMessage(sender) {
    Message.call(this, sender, UpdateMessage.type());
};

UpdateMessage.prototype = Object.create(Message.prototype);

UpdateMessage.prototype.constructor = Message;

UpdateMessage.type = function() {
    return "UPDATE";
};

function BootstrappingNode(peer, options) {
    this.peer = peer;
    this.options = options;
};

BootstrappingNode.prototype.connect = function() {
    var self = this;

    this.websocket = new WebSocket(this.options.url, this.options.protocols);
    this.websocket.onopen = function (event) {
        self.send(new DiscoveryRequestMessage(self.peer.descriptor));
    };

    this.websocket.onmessage = function (event) {
        self.peer.onmessage(JSON.parse(event.data), self);
    };

    this.websocket.onclose = function(event) {
        self.peer.disconnect();
    };
};

BootstrappingNode.prototype.disconnect = function() {
    this.websocket.close();
};

BootstrappingNode.prototype.send = function(message) {
    if(this.isConnected()) {
        this.websocket.send(JSON.stringify(message));
    }
};

BootstrappingNode.prototype.isConnected = function() {
    return (this.websocket.readyState === WebSocket.OPEN);
};

function GeoBucket(position, options) {
    this.position = position;
    this.options = options;
    this.nodes = new Set();
};

GeoBucket.prototype.move = function(position) {
    this.position = position;
    var unfollowers = false;
    for(var node of this.nodes) {
        if(!this.follows(node.descriptor.position)) {
            this.remove(node);
            unfollowers = true;
        } else {
            node.send(new UpdateMessage(node.peer.descriptor));
        }
    }
    return unfollowers;
};

GeoBucket.prototype.update = function(descriptor) {
    var node = this.get(descriptor);
    if(node && node.descriptor.position.timestamp < descriptor.position.timestamp) {
        node.descriptor = descriptor;
        return true;
    } else {
        return false;
    }
};

GeoBucket.prototype.has = function(node) {
    for(var n of this.nodes) {
        if(n.descriptor.key === node.descriptor.key) {
            return true;
        }
    }
    return false;
};

GeoBucket.prototype.follows = function(position) {
    return GeoBucket.checkAffinity(this.position, position, this.options);
};

GeoBucket.prototype.get = function(descriptor) {
    for(var node of this.nodes) {
        if(node.descriptor.key === descriptor.key) {
            return node;
        }
    }
    return null;
};

GeoBucket.prototype.add = function(node) {
    if(this.has(node)) {
        return this.update(node.descriptor);
    } else {
        if(this.nodes.size >= this.options.upper_limit) {
            var oldestNode = this.nodes.values().next().value;
            for(var n of this.nodes) {
                if(n.descriptor.position.timestamp < oldestNode.descriptor.position.timestamp) {
                    oldestNode = n;
                }
            }
            if(node.descriptor.position.timestamp <= oldestNode.descriptor.position.timestamp) {
                return false;
            } else {
                this.remove(oldestNode);
                this.nodes.add(node);
                return true;
            }
        } else {
            this.nodes.add(node);
            return true;
        }
    }
};

GeoBucket.prototype.remove = function(node) {
    if(this.has(node)) {
        node.disconnect();
        this.nodes.delete(node);
        return true;
    } else {
        return false;
    }
};

GeoBucket.prototype.removeAll = function() {
    for(var node of this.nodes) {
        node.disconnect();
    }
    this.nodes.clear();
};

GeoBucket.prototype.retrieve = function(position, limit) {
    var nodes = [];
    for(var node of this.nodes) {
        if(nodes.length >= limit) {
            break;
        } else {
            if(GeoBucket.checkAffinity(node.descriptor.position, position, this.options)) {
                nodes.push(node);
            }
        }
    }
    return new Set(nodes.slice(0, limit));
};

GeoBucket.prototype.size = function() {
    return this.nodes.size;
};

GeoBucket.prototype.geocast = function(data) {
    for(var node of this.nodes) {
        var message = new DataMessage(node.peer.descriptor, this.position, data);
        node.send(message);
    }
};

GeoBucket.prototype.send = function(data, descriptor) {
    var node = this.get(descriptor);
    if(node !== null) {
        var message = new DataMessage(node.peer.descriptor, this.position, data);
        node.send(message);
    }
};

GeoBucket.prototype.descriptors = function() {
    var descriptors = [];
    for(var node of this.nodes) {
        descriptors.push(node.descriptor);
    }
    return descriptors;
};

GeoBucket.checkAffinity = function(position1, position2, options) {
    return (Geography.distance(position1.coords.latitude, position1.coords.longitude, position2.coords.latitude, position2.coords.longitude) <= 2 * options.radius);
};

function RemoteNode(peer, descriptor, options, bootstrappingNode, signalingNode, isCalled) {
    this.peer = peer;
    this.descriptor = descriptor;
    this.options = options;
    this.bootstrappingNode = bootstrappingNode;
    this.signalingNode = signalingNode;
    this.pendingMessages = new Set();

    var self = this;
    this.connection = new RTCPeerConnection(options.configuration);

    this.connection.onicecandidate = function (event) {
        if(event.candidate) {
            self.sendToSignalingNode(new SignalingMessage(self.peer.descriptor, self.descriptor, new CandidateMessage(self.peer.descriptor, event.candidate)));
        }
    };

    this.connection.ondatachannel = function(event) {
        self.datachannel = event.channel;

        self.datachannel.onmessage = function(event) {
            self.peer.onmessage(JSON.parse(event.data), self);
        };

        self.datachannel.onclose = function (event) {
            self.peer.geobucket.remove(self);
            self.peer.emit("neighbors", self.peer.geobucket.descriptors());
        };

        self.datachannel.onopen = function (event) {
            self.pendingMessages.forEach(function(message) {
                self.datachannel.send(JSON.stringify(message));
                console.log('Sent ' + message.type + ' to ' + self.descriptor.key);
            });
            self.pendingMessages.clear();
        };
    };

    if(isCalled) {
        this.datachannel = this.connection.createDataChannel(options.label, options.datachannel_options);

        this.datachannel.onmessage = function(event) {
            self.peer.onmessage(JSON.parse(event.data), self);
        };

        this.datachannel.onclose = function (event) {
            self.peer.geobucket.remove(self);
            self.peer.emit("neighbors", self.peer.geobucket.descriptors());
        };

        this.datachannel.onopen = function (event) {
            self.pendingMessages.forEach(function(message) {
                self.datachannel.send(JSON.stringify(message));
                console.log('Sent ' + message.type + ' to ' + self.descriptor.key);
            });
            self.pendingMessages.clear();
        };
    }
};

RemoteNode.prototype.isConnected = function() {
    return (this.datachannel && ("open" === this.datachannel.readyState));
};

RemoteNode.prototype.connect = function() {
    var self = this;

    this.connection.createOffer().then(function(offer) {
        return self.connection.setLocalDescription(offer);
    }).then(function() {
        self.sendToSignalingNode(new SignalingMessage(self.peer.descriptor, self.descriptor, new OfferMessage(self.peer.descriptor, self.connection.localDescription)));
    }).catch(function(reason) {
        // An error occurred, so handle the failure to connect
    });
};

RemoteNode.prototype.send = function(message) {
    if(this.isConnected()) {
        this.datachannel.send(JSON.stringify(message));
        console.log('Sent ' + message.type + ' to ' + this.descriptor.key);
    } else {
        this.pendingMessages.add(message);
    }
};

RemoteNode.prototype.sendToSignalingNode = function(message) {
    if(this.signalingNode.isConnected()) {
        this.signalingNode.send(message);
    } else {
        this.bootstrappingNode.send(message);
    }
};

RemoteNode.prototype.disconnect = function() {
    if(this.isConnected()) {
        this.sendToSignalingNode(new SignalingMessage(this.peer.descriptor, this.descriptor, new LeaveMessage(this.peer.descriptor)));
        this.datachannel.close();
        this.connection.close();
        this.connection.onicecandidate = null;
    }
};

RemoteNode.prototype.setSignalingNode = function(signalingNode) {
    this.signalingNode = signalingNode;
};

function Peer(options) {
    var position = Geography.mockPosition();
    this.descriptor = new Descriptor(Math.random().toString().replace('.', ''), position);
    this.bootstrappingNode = new BootstrappingNode(this, options.websocket);
    this.geobucket = new GeoBucket(position, options.geobucket);
    this.options = options;
    this.listeners = new Map();
};

Peer.prototype.geocast = function(message) {
    this.geobucket.geocast(message);
};

Peer.prototype.send = function(message, descriptor) {
    this.geobucket.send(message, descriptor);
};

Peer.prototype.on = function(event, callback) {
    if(this.listeners.has(event)) {
        this.listeners.get(event).add(callback);
    } else {
        var callbacks = new Set();
        callbacks.add(callback);
        this.listeners.set(event, callbacks);
    }
};

Peer.prototype.emit = function() {
    var event = arguments[0];
    if(this.listeners.has(event)) {
        switch(event) {
          case 'neighbors':
             var descriptors = arguments[1];
             for(var callback of this.listeners.get(event)) {
                callback(descriptors);
             }
             break;
           case 'data':
             var descriptor = arguments[1];
             var data = arguments[2];
             for(var callback of this.listeners.get(event)) {
                callback(descriptor, data);
             }
             break;
        }
    }
};

Peer.prototype.move = function(position) {
    var p = {coords: {latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, altitude: position.coords.altitude, altitudeAccuracy: position.coords.altitudeAccuracy, heading: position.coords.heading, speed: position.coords.speed}, timestamp: position.timestamp};
    this.descriptor.position = p;
    if(this.geobucket.move(p)) {
        this.emit("neighbors", this.geobucket.descriptors());
    }
};

Peer.prototype.follows = function(position) {
    return this.geobucket.follows(position);
};

Peer.prototype.onmessage = function(message, node) {
    if(message.sender) {
        console.log('Received ' + message.type + ' from ' + message.sender.key);
    } else {
        console.log('Received ' + message.type + ' from Bootstrapping Node');
    }
    switch(message.type) {
        case DiscoveryRequestMessage.type():
            var descriptors = [];
            for(var n of this.geobucket.retrieve(message.sender.position, this.options.discovery.response_limit)) {
                descriptors.push(n.descriptor);
            }
            node.send(new DiscoveryResponseMessage(this.descriptor, descriptors));
            break;

        case DiscoveryResponseMessage.type():
            for(var index in message.descriptors) {
                var descriptor = message.descriptors[index];
                if(this.descriptor.key !== descriptor.key && this.follows(descriptor.position)) {
                    var remoteNode = this.geobucket.get(descriptor);
                    if(remoteNode) {
                        if(this.geobucket.update(descriptor)) {
                            remoteNode.setSignalingNode(node);
                            this.emit("neighbors", this.geobucket.descriptors());
                        }
                    } else {
                        remoteNode = new RemoteNode(this, descriptor, this.options.webrtc, this.bootstrappingNode, node, true);
                        if(this.geobucket.add(remoteNode)) {
                            remoteNode.connect();
                            this.emit("neighbors", this.geobucket.descriptors());
                        }
                    }
                }
            }
            break;

        case UpdateMessage.type():
            if(this.geobucket.update(message.sender)) {
                this.emit("neighbors", this.geobucket.descriptors());
            }
            break;

        case DataMessage.type():
            this.emit("data", message.sender, message.data);
            break;

        case LeaveMessage.type():
            var node = this.geobucket.get(message.sender);
            if(node !== null) {
                if(this.geobucket.remove(node)) {
                    this.emit("neighbors", this.geobucket.descriptors());
                }
            }
            break;

        case AnswerMessage.type():
            var node = this.geobucket.get(message.sender);
            if(node !== null) {
                node.connection.setRemoteDescription(new RTCSessionDescription(message.answer));
            }
            break;

        case OfferMessage.type():
            if(this.follows(message.sender.position)) {
                var remoteNode = new RemoteNode(this, message.sender, this.options.webrtc, this.bootstrappingNode, node, false);
                if(!this.geobucket.has(remoteNode)) {
                    var self = this;
                    remoteNode.connection.setRemoteDescription(new RTCSessionDescription(message.offer));

                    remoteNode.connection.createAnswer().then(function(answer) {
                        return remoteNode.connection.setLocalDescription(answer);
                    }).then(function() {
                        remoteNode.sendToSignalingNode(new SignalingMessage(self.descriptor, message.sender, new AnswerMessage(self.descriptor, remoteNode.connection.localDescription)));
                    }).catch(function(reason) {
                        // An error occurred, so handle the failure to connect
                    });

                    if(this.geobucket.add(remoteNode)) {
                        this.emit("neighbors", this.geobucket.descriptors());
                    }
                }
            }
            break;

        case CandidateMessage.type():
            var node = this.geobucket.get(message.sender);
            if(node !== null) {
                node.connection.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
            break;

        case SignalingMessage.type():
            var node = this.geobucket.get(message.recipient);
            if(node != null) {
                node.send(message.payload);
            }
            break;
    }
};

Peer.prototype.connect = function() {
    this.bootstrappingNode.connect();

    var self = this;
    setInterval(function() {
        self.task();
    }, this.options.discovery.period);
};

Peer.prototype.disconnect = function() {
    this.geobucket.removeAll();
    if(this.bootstrappingNode.isConnected()) {
        this.bootstrappingNode.disconnect();
    }
};

Peer.prototype.task = function() {
    console.log('-------------------- ' + this.descriptor.key + ' --------------------');
    console.log('Neighbors: [' + this.geobucket.descriptors().map(function(descriptor){return descriptor.key}).join(', ') + ']');
    if(this.bootstrappingNode.isConnected()) {
        if(this.geobucket.size() < this.options.geobucket.lower_limit) {
            this.bootstrappingNode.send(new DiscoveryRequestMessage(this.descriptor));
        }

        var nodes = this.geobucket.retrieve(this.descriptor.position, this.options.discovery.request_limit);
        var message = new DiscoveryRequestMessage(this.descriptor);
        for(var node of nodes) {
            node.send(message);
        }
    }
};
