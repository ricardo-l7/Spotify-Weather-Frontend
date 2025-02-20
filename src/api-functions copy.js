import credentials from "./credentials";

let id = '4aa2e2d16efe46e198d444f232e96695'; // client id
let sec = '42147b97f5254fc1b06949d1cc3f0694'; // secret
const redirect_uri = 'http://localhost:3000'; // feel free to edit

let access_token = null;
let refresh_token = null;
let currentPlaylist = "";

const AUTHORIZE = "https://accounts.spotify.com/authorize"
const TOKEN = "https://accounts.spotify.com/api/token";
const PLAYLISTS = "https://api.spotify.com/v1/me/playlists";
const DEVICES = "https://api.spotify.com/v1/me/player/devices";
const PLAY = "https://api.spotify.com/v1/me/player/play";
const PAUSE = "https://api.spotify.com/v1/me/player/pause";
const NEXT = "https://api.spotify.com/v1/me/player/next";
const PREVIOUS = "https://api.spotify.com/v1/me/player/previous";
const PLAYER = "https://api.spotify.com/v1/me/player";
const TRACKS = "https://api.spotify.com/v1/playlists/{{PlaylistId}}/tracks";
const CURRENTLYPLAYING = "https://api.spotify.com/v1/me/player/currently-playing";
const SHUFFLE = "https://api.spotify.com/v1/me/player/shuffle";

export const onPageLoad = () => {
    const spt = credentials();
    // query backend for id and secret
    id = spt.ClientId;
    sec = spt.ClientSecret;
    // is this how you have a localstorage item
    if (!localStorage.getItem('spotify-token')) {
        // display login alert
        return false;
    }
    refreshAccessToken();
    access_token = localStorage.getItem("access_token");

}

export const handleRedirect = () => {
    let code = getCode();
    fetchAccessToken(code);
    window.history.pushState("", "", redirect_uri); // remove param from url
}

export const getCode = () => {
    let code = null;
    const queryString = window.location.search;
    if (queryString.length > 0) {
        const urlParams = new URLSearchParams(queryString);
        code = urlParams.get('code')
    }
    return code;
}

export const requestAuthorization = () => {
    // TODO: get id's from backend
    let url = AUTHORIZE;
    url += "?client_id=" + id;
    url += "&response_type=code";
    url += "&redirect_uri=" + encodeURI(redirect_uri);
    url += "&show_dialog=true";
    url += "&scope=user-read-private user-read-email user-modify-playback-state user-read-playback-position user-library-read streaming user-read-playback-state user-read-recently-played playlist-read-private";
    window.location.href = url; // Show Spotify's authorization screen
}

export const fetchAccessToken = (code) => {
    let body = "grant_type=authorization_code";
    body += "&code=" + code;
    body += "&redirect_uri=" + encodeURI(redirect_uri);
    body += "&id=" + id;
    body += "&sec=" + sec;
    callAuthorizationApi(body);
}

export const refreshAccessToken = () => {
    refresh_token = localStorage.getItem("refresh_token");
    let body = "grant_type=refresh_token";
    body += "&refresh_token=" + refresh_token;
    body += "&id=" + id;
    callAuthorizationApi(body);
}

export const callAuthorizationApi = (body) => {
    let xhr = new XMLHttpRequest();
    xhr.open("POST", TOKEN, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(id + ":" + sec));
    xhr.send(body);
    xhr.onload = handleAuthorizationResponse;
}

export const handleAuthorizationResponse = () => {
    if (this.status === 200) {
        const data = JSON.parse(this.responseText);
        console.log(data);
        if (data.access_token !== undefined) {
            access_token = data.access_token;
            localStorage.setItem("access_token", access_token);
        }
        if (data.refresh_token !== undefined) {
            refresh_token = data.refresh_token;
            localStorage.setItem("refresh_token", refresh_token);
        }
        onPageLoad();
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

export const refreshDevices = () => {
    callApi("GET", DEVICES, null, handleDevicesResponse);
}

export const handleDevicesResponse = () => {
    if (this.status === 200) {
        const data = JSON.parse(this.responseText);
        console.log(data);
        removeAllItems("devices");
        data.devices.forEach(item => addDevice(item));
    }
    else if (this.status === 401) {
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

export const addDevice = (item) => {
    let node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name;
    document.getElementById("devices").appendChild(node);
}

export const callApi = (method, url, body, callback) => {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + access_token);
    xhr.send(body);
    xhr.onload = callback;
}

export const refreshPlaylists = () => {
    callApi("GET", PLAYLISTS, null, handlePlaylistsResponse);
}

export const handlePlaylistsResponse = () => {
    if (this.status === 200) {
        const data = JSON.parse(this.responseText);
        console.log(data);
        removeAllItems("playlists");
        data.items.forEach(item => addPlaylist(item));
        document.getElementById('playlists').value = currentPlaylist;
    }
    else if (this.status === 401) {
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

export const addPlaylist = (item) => {
    let node = document.createElement("option");
    node.value = item.id;
    node.innerHTML = item.name + " (" + item.tracks.total + ")";
    document.getElementById("playlists").appendChild(node);
}

export const removeAllItems = (elementId) => {
    let node = document.getElementById(elementId);
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

export const play = () => {
    let playlist_id = document.getElementById("playlists").value;
    let trackindex = document.getElementById("tracks").value;
    let album = document.getElementById("album").value;
    let body = {};
    if (album.length > 0) {
        body.context_uri = album;
    }
    else {
        body.context_uri = "spotify:playlist:" + playlist_id;
    }
    body.offset = {};
    body.offset.position = trackindex.length > 0 ? Number(trackindex) : 0;
    body.offset.position_ms = 0;
    callApi("PUT", PLAY + "?device_id=" + deviceId(), JSON.stringify(body), handleApiResponse);
}

export const shuffle = () => {
    callApi("PUT", SHUFFLE + "?state=true&device_id=" + deviceId(), null, handleApiResponse);
    play();
}

export const pause = () => {
    callApi("PUT", PAUSE + "?device_id=" + deviceId(), null, handleApiResponse);
}

export const next = () => {
    callApi("POST", NEXT + "?device_id=" + deviceId(), null, handleApiResponse);
}

export const previous = () => {
    callApi("POST", PREVIOUS + "?device_id=" + deviceId(), null, handleApiResponse);
}

export const transfer = () => {
    let body = {};
    body.device_ids = [];
    body.device_ids.push(deviceId())
    callApi("PUT", PLAYER, JSON.stringify(body), handleApiResponse);
}

export const handleApiResponse = () => {
    if (this.status === 200) {
        console.log(this.responseText);
        setTimeout(currentlyPlaying, 2000);
    }
    else if (this.status === 204) {
        setTimeout(currentlyPlaying, 2000);
    }
    else if (this.status === 401) {
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

export const deviceId = () => {
    return document.getElementById("devices").value;
}

export const fetchTracks = () => {
    let playlist_id = document.getElementById("playlists").value;
    if (playlist_id.length > 0) {
        const url = TRACKS.replace("{{PlaylistId}}", playlist_id);
        callApi("GET", url, null, handleTracksResponse);
    }
}

export const handleTracksResponse = () => {
    if (this.status === 200) {
        const data = JSON.parse(this.responseText);
        console.log(data);
        removeAllItems("tracks");
        data.items.forEach((item, index) => addTrack(item, index));
    }
    else if (this.status === 401) {
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}

export const addTrack = (item, index) => {
    let node = document.createElement("option");
    node.value = index;
    node.innerHTML = item.track.name + " (" + item.track.artists[0].name + ")";
    document.getElementById("tracks").appendChild(node);
}

export const currentlyPlaying = () => {
    callApi("GET", PLAYER + "?market=US", null, handleCurrentlyPlayingResponse);
}

export const handleCurrentlyPlayingResponse = () => {
    if (this.status === 200) {
        const data = JSON.parse(this.responseText);
        console.log(data);
        if (data.item !== null) {
            document.getElementById("albumImage").src = data.item.album.images[0].url;
            document.getElementById("trackTitle").innerHTML = data.item.name;
            document.getElementById("trackArtist").innerHTML = data.item.artists[0].name;
        }


        if (data.device !== null) {
            // select device
            const currentDevice = data.device.id;
            document.getElementById('devices').value = currentDevice;
        }

        if (data.context !== null) {
            // select playlist
            currentPlaylist = data.context.uri;
            currentPlaylist = currentPlaylist.substring(currentPlaylist.lastIndexOf(":") + 1, currentPlaylist.length);
            document.getElementById('playlists').value = currentPlaylist;
        }
    }
    else if (this.status === 204) {

    }
    else if (this.status === 401) {
        refreshAccessToken()
    }
    else {
        console.log(this.responseText);
        alert(this.responseText);
    }
}







