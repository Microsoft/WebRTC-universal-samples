﻿var webrtcDetectedBrowser = null;
var webrtcDetectedVersion = null;
var RTCConfiguration = null;
var RTCBundlePolicy = null;
var RTCIceTransportPolicy = null;
var RTCIceServer = null;
var RTCSessionDescription = null;
var RTCPeerConnection = null;


if (Org.WebRtc) {

  function Promise(executor) {
    var self = this;
    this.executor = executor;
    this.completeDisp = function () {
    }
    this.errorDisp = function (value) {
      if (self.catchDisp !== undefined) {
        self.catchDisp(value);
      }
      else {
        throw new Error("WinJS Promise error not handled!");
      }
    }

    this.internalInit = function (completeDisp, errorDisp) {
      if (self.executor !== undefined) {
        try {
          self.executor(completeDisp, errorDisp);
        }
        catch (e) {
          if (self.catchFunction !== undefined) {
            self.catchFunction(e.toString());
          }
          else {
            throw e;
          }
        }
      }
    }
    this.internalPromise = new WinJS.Promise(this.internalInit);
  }

  Promise.resolve = function (value) {
    var ret = new Promise();
    ret.internalPromise = WinJS.Promise.as(value);
    return ret;
  }

  Promise.all = function (iterable) {
    var ret = new Promise();
    ret.internalPromise = WinJS.Promise.join(iterable);
    return ret;
  }

  Promise.wrapWinJS = function (winRTPromise) {
    var ret = new Promise();
    ret.internalPromise = winRTPromise;
    return ret;
  }

  Promise.prototype.catch = function (onRequected) {
    this.catchFunction = onRequected;
    return this;
  }

  Promise.prototype.then = function (onFulfilled, onRejected) {
    this.internalPromise.then(onFulfilled, onRejected).done(this.completeDisp, this.errorDisp);
    return this;
  }

  Promise.prototype.done = function (onFulfilled, onRejected) {
    this.internalPromise.done(onFulfilled, onRejected);
    return this;
  }

  // ask for permission to access camera, then initialize api
  Org.WebRtc.WinJSHooks.requestAccessForMediaCapture().then(function (requested) {
    Org.WebRtc.WinJSHooks.initialize();

  });

  // TODO: set user-agent
  //webrtcDetectedBrowser = null;
  //webrtcDetectedVersion = null;

  getUserMedia = function (constraints, onSuccess, onError) {
    var constraintsOverride = new Org.WebRtc.RTCMediaStreamConstraints();
    constraintsOverride.audioEnabled = true;
    constraintsOverride.videoEnabled = true;

    var localMedia = Org.WebRtc.Media.createMedia();


    var selectedAudio = null;
    var selectedVideo = null;


    var localAudioDevices = localMedia.getAudioCaptureDevices();
    var localVideoDevices = localMedia.getVideoCaptureDevices();

    var userSelectedAudioName = window.localStorage.selectedAudio;
    var userSelectedVideoName = window.localStorage.selectedVideo;

    for (var index in localAudioDevices) {
      if (userSelectedAudioName != undefined
        && localAudioDevices[index].name == userSelectedAudioName) {
        selectedAudio = localAudioDevices[index];
        break;
      }
    }

    for (var index in localVideoDevices) {
      if (userSelectedVideoName != undefined
        && localVideoDevices[index].name == userSelectedVideoName) {
        selectedVideo = localVideoDevices[index];
        break;
      }
    }

    if (selectedAudio != null)
      localMedia.selectAudioCaptureDevice(selectedAudio);
    if (selectedVideo != null)
      localMedia.selectVideoDevice(selectedVideo);

    var winPromise = localMedia.getUserMedia(constraintsOverride).then(function (mediaStream) {

      if (onSuccess) {
        onSuccess(mediaStream);
      }
      return mediaStream;
    });
    return Promise.wrapWinJS(winPromise);
  }
  navigator.getUserMedia = getUserMedia;

  releaseUserMedia = function (stream) {
    var tracks = stream.getTracks();
    for (var index = 0; index < tracks.length; index++) {
      var aTrack = tracks[index];
      aTrack.stop();
      stream.removeTrack(tracks[index]);
    }
  }

  navigator.releaseUserMedia = releaseUserMedia;

  RTCBundlePolicy = Org.WebRtc.RTCBundlePolicy;
  RTCIceTransportPolicy = Org.WebRtc.RTCIceTransportPolicy;

  RTCConfiguration = function () {
    return new Org.WebRtc.RTCConfiguration();
  };
  RTCIceServer = function () {
    return new Org.WebRtc.RTCIceServer();
  };
  RTCIceCandidate = function (candidate) {
    if (candidate !== undefined) {
      this.candidate = candidate.candidate;
      this.sdpMid = candidate.sdpMid;
      this.sdpMLineIndex = candidate.sdpMLineIndex;
    }
  };
  window.RTCIceCandidate = RTCIceCandidate;

  RTCSessionDescription = function (message) {
    var sdpType;
    if (message.type == 'offer') {
      sdpType = Org.WebRtc.RTCSdpType.offer;
    }
    else if (message.type == 'answer') {
      sdpType = Org.WebRtc.RTCSdpType.answer;
    }
    else {
      sdpType = Org.WebRtc.RTCSdpType.pranswer;
    }
    return new Org.WebRtc.RTCSessionDescription(sdpType, message.sdp);
  };

  attachMediaStream = function (element, stream) {
    var aMedia = Org.WebRtc.Media.createMedia();
    if (stream && stream.getVideoTracks()
      && stream.getVideoTracks().length > 0) {
      element.msRealTime = true;
      element.autoPlay = true;
      element.videoTrack = stream.getVideoTracks().first().current;
      element.srcId = stream.id;
      element.stream = stream;
      var streamSource = aMedia.createMediaSource(element.videoTrack, stream.id);
      var mediaSource = Windows.Media.Core.MediaSource.createFromIMediaSource(streamSource);
      var mediaPlaybackItem = new Windows.Media.Playback.MediaPlaybackItem(mediaSource);
      var playlist = new Windows.Media.Playback.MediaPlaybackList();
      playlist.items.append(mediaPlaybackItem);
      element.src = URL.createObjectURL(playlist, { oneTimeOnly: true });
      element.onError = function () {
          var ss = aMedia.createMediaSource(element.videoTrack, stream.id);
          element.stream = ss;
      };
    }
  };
  // save on navigator object so if set to null by app we can override that after
  navigator.attachMediaStream = attachMediaStream;

  reattachMediaStream = function (to, from) {
    if (typeof from.stream === 'undefined') {
      return;
    }
    to.msRealTime = true;
    to.stream = from.stream;
    var stream = from.stream;
    var aMedia = Org.WebRtc.Media.createMedia();
    if (stream && stream.getVideoTracks()
      && stream.getVideoTracks() && stream.getVideoTracks().length > 0) {
      to.msRealTime = true;
      to.videoTrack = stream.getVideoTracks().first().current;
      var streamSource = aMedia.createMediaSource(to.videoTrack, "SomeId");
      var mediaSource = Windows.Media.Core.MediaSource.createFromIMediaSource(streamSource);
      var mediaPlaybackItem = new Windows.Media.Playback.MediaPlaybackItem(mediaSource);
      var playlist = new Windows.Media.Playback.MediaPlaybackList();
      playlist.items.append(mediaPlaybackItem);
      to.src = URL.createObjectURL(playlist, { oneTimeOnly: true });
      to.onError = function () {
          var ss = aMedia.createMediaSource(to.videoTrack, "SomeId");
          to.stream = ss;
      };
    }
  };
  // save on navigator object so if set to null by app we can override that after
  navigator.reattachMediaStream = reattachMediaStream;

  RTCPeerConnection = function (pcConfig, pcConstraints) {
    //Todo: do we need to implement pcConstraints in C++/CX API?
    var winrtConfig = new Org.WebRtc.RTCConfiguration();
    if (pcConfig.iceServers && pcConfig.iceServers.length > 0) {
      var iceServer = new Org.WebRtc.RTCIceServer();
      if (pcConfig.iceServers[0].urls != null) {
        iceServer.url = pcConfig.iceServers[0].urls[0];
      } else {
        iceServer.url = pcConfig.iceServers[0].url;
      }
      iceServer.credential = pcConfig.iceServers[0].credential;
      iceServer.username = pcConfig.iceServers[0].username;
      winrtConfig.iceServers = [];
      winrtConfig.iceServers.push(iceServer);

    }

    var nativePC = new Org.WebRtc.RTCPeerConnection(winrtConfig);
    var pc = {};
    pc.remoteDescription = null;
    pc.localDescription = null;
    pc.nativePC_ = nativePC;

    pc.createOffer = function (sdpConstraints) {
      return new Promise(function (resolve, reject) {
        pc.nativePC_.createOffer().then(function (offerSDP) {
          var newOfferSDP = {};
          // HACK: This is a hack to force VP8 while we're waiting for VP9 to be
          // fully implemented.
          newOfferSDP.sdp = offerSDP.sdp.replace(' 101 100', ' 100 101');
          switch (offerSDP.type) {
            case 0: newOfferSDP.type = 'offer'; break;
            case 1: newOfferSDP.type = 'pranswer'; break;
            case 2: newOfferSDP.type = 'answer'; break;
            default: throw 'invalid offer type';
          }
          resolve(newOfferSDP);
        }, function (e) {
          onfailure(e);
        });
      });
    };
    pc.createAnswer = function (sdpConstraints) {
      return new Promise(function (resolve, reject) {
        pc.nativePC_.createAnswer().then(function (answerSDP) {
          var newAnswerSDP = {};
          // HACK: This is a hack to force VP8 while we're waiting for VP9 to be
          // fully implemented.
          newAnswerSDP.sdp = answerSDP.sdp.replace(' 101 100', ' 100 101');
          switch (answerSDP.type) {
            case 0: newAnswerSDP.type = 'offer'; break;
            case 1: newAnswerSDP.type = 'pranswer'; break;
            case 2: newAnswerSDP.type = 'answer'; break;
            default: throw 'invalid offer type';
          }
          resolve(newAnswerSDP);
        }, function (e) {
          onfailure(e);
        });
      });
    };
    pc.setLocalDescription = function (desc) {
      var winrtSDP = new RTCSessionDescription(desc);
      return new Promise(function (resolve, reject) {
        pc.nativePC_.setLocalDescription(winrtSDP).then(function () {
          resolve();
        }, function (e) {
          console.log("Error: ", e);
          reject(e);
        });
      });
    };
    pc.setRemoteDescription = function (desc) {
      // HACK: This is a hack to force VP8 while we're waiting for VP9 to be
      // fully implemented.
      var winrtSDP = desc;
      winrtSDP.sdp = desc.sdp.replace(' 101 100', ' 100 101');
      return new Promise(function (resolve, reject) {
          pc.nativePC_.setRemoteDescription(winrtSDP).then(function () {
          resolve();
        }, function e() {
          console.log("Error: ", e);
          reject(e);
        });
      });
    };
    pc.getConfiguration = function () {
      var bound = pc.nativePC_.getConfiguration.bind(pc.nativePC_);
      return bound();
    };
    pc.getLocalStreams = function () {
      var bound = pc.nativePC_.getLocalStreams.bind(pc.nativePC_);
      return bound();
    };
    pc.getRemoteStreams = function () {
      var bound = pc.nativePC_.getRemoteStreams.bind(pc.nativePC_);
      return bound();
    };
    pc.getStreamById = function (id) {
      var bound = pc.nativePC_.getStreamById.bind(pc.nativePC_);
      return bound(id);
    };
    pc.addStream = function (stream) {
      var bound = pc.nativePC_.addStream.bind(pc.nativePC_);
      return bound(stream);
    };
    pc.removeStream = function (stream) {
      var bound = pc.nativePC_.removeStream.bind(pc.nativePC_);
      return bound(stream);
    };
    pc.createDataChannel = function (label, init) {
      var bound = pc.nativePC_.createDataChannel.bind(pc.nativePC_);
      return bound(label, init);
    };
    pc.addIceCandidate = function (candidate) {
      var nativeCandidate = new Org.WebRtc.RTCIceCandidate(candidate.candidate,
        (typeof candidate.sdpMid !== 'undefined') ? candidate.sdpMid : '', candidate.sdpMLineIndex);
      return new Promise(function (resolve, reject) {
        pc.nativePC_.addIceCandidate(nativeCandidate).then(function () {
          resolve();
        }, function () {
          console.log("Error: ", e);
          reject(e);
        });
      });
    };
    pc.close = function () {
      var bound = pc.nativePC_.close.bind(pc.nativePC_);
      return bound();
    };
    pc.nativePC_.ononicecandidate = function (e) {
      pc.updateProperties();
      if (pc.onicecandidate !== undefined) {
        pc.onicecandidate(e.target);
      }
    };
    pc.nativePC_.ononaddstream = function (e) {
      pc.updateProperties();
      if (pc.onaddstream !== undefined) {
        pc.onaddstream(e.target);
      }
    };
    pc.nativePC_.onondatachannel = function (e) {
      pc.updateProperties();
      if (pc.ondatachannel !== undefined) {
        pc.ondatachannel(e.target);
      }
    };
    pc.nativePC_.ononremovestream = function (e) {
      pc.updateProperties();
      if (pc.onremovestream !== undefined) {
        pc.onremovestream(e.target);
      }
    };
    pc.nativePC_.ononnegotiationneeded = function (e) {
      pc.updateProperties();
      if (pc.onnegotiationneeded !== undefined) {
        pc.onnegotiationneeded(e.target);
      }
    };
    pc.nativePC_.ononiceconnectionstatechange = function (e) {
      pc.updateProperties();
      if (pc.oniceconnectionstatechange !== undefined) {
        pc.oniceconnectionstatechange(e.target);
      }
    }
    pc.nativePC_.ononsignallingstatechange = function (e) {
      pc.updateProperties();
      if (pc.onsignallingstatechange !== undefined) {
        pc.onsignallingstatechange(e); // e has no "target" property
      }
    };
    pc.getStats = function () { };
    pc.updateProperties = function () {
      pc.localDescription = this.nativePC_.localDescription;
      pc.remoteDescription = this.nativePC_.remoteDescription;
      pc.iceGatheringState = this.nativePC_.iceGatheringState;
      switch (this.nativePC_.signallingState) {
        case 0:
          pc.signallingState = 'stable';
          break;
        case 1:
          pc.signallingState = 'have-local-offer';
          break;
        case 2:
          pc.signallingState = 'have-local-pranswer';
          break;
        case 3:
          pc.signallingState = 'have-remote-offer';
          break;
        case 4:
          pc.signallingState = 'have-remote-pranswer';
          break;
        case 5:
          pc.signallingState = 'closed';
          break;
        default:
          throw 'invalid signalling state';
      }
      switch (this.nativePC_.iceConnectionState) {
        case 0:
          pc.iceConnectionState = 'new';
          break;
        case 1:
          pc.iceConnectionState = 'checking';
          break;
        case 2:
          pc.iceConnectionState = 'connected';
          break;
        case 3:
          pc.iceConnectionState = 'completed';
          break;
        case 4:
          pc.iceConnectionState = 'failed';
          break;
        case 5:
          pc.iceConnectionState = 'disconnected';
          break;
        case 6:
          pc.iceConnectionState = 'closed';
          break;
        default:
          throw 'invalid connection state';
      }
    };

    pc.updateProperties();

    return pc;
  };
  // save on navigator object so if set to null by app we can override that after
  navigator.RTCPeerConnection = RTCPeerConnection;

  window.history.pushState = function () { };
  window.createIceServers = function (urls, username, password) { };
}
