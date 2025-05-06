function popup() {
  var {song, external_urls, artist, artist_2, device} = generate_sharelink()

  if(song == undefined){
    var ui = FormApp.getUi();
    ui.alert('APIresponse：204 曲を再生していません');
  }else{
    var text;
    var plaintext;
  
    song = song.replace("&",'&amp;').replace("'","&#39;").replace('"','&#34;');
    artist = artist.replace("&",'&amp;').replace("'","&#39;").replace('"','&#34;');

    if(artist_2 == ""){
      text = "🎵%20[" + song + "](" + external_urls + ")%0A🎤%20" + artist + "%0A%23nowplaying%3Csmall%3E%20|%20" + device + "%3C/small%3E";
      plaintext = "🎵 [" + song + "](" + external_urls + ")<br>🎤 " + artist + "<br>#nowplaying&lt;small&gt; | " + device + "&lt;/small&gt;"
    }else{
      artist_2 = artist_2.replace("&",'&amp;').replace("'","&#39;").replace('"','&#34;');
      text = "🎵%20[" + song + "](" + external_urls + ")%0A🎤%20" + artist + "%0A🎤%20" + artist_2 + "%0A%23nowplaying%3Csmall%3E%20|%20" + device + "%3C/small%3E";
      plaintext = "🎵 [" + song + "](" + external_urls + ")<br>🎤 " + artist + "<br>🎤 " + artist_2 +"<br>#nowplaying&lt;small&gt; | " + device + "&lt;/small&gt;"
    }

    var url_1 = "https://misskey.io/share?text=" + text;
  
    var script = "<h3><a href='" +url_1+ "' target='window.open'>Note to misskey.io</a></h3><hr><b>rawtext</b><br>"+ plaintext;
    var html = HtmlService.createHtmlOutput(script);
    FormApp.getUi().showModalDialog(html, 'Generated link');
  }
}

function generate_sharelink() {

  // 認証情報
  const client_id = PropertiesService.getScriptProperties().getProperty("Client ID");
  const client_secret = PropertiesService.getScriptProperties().getProperty("Client secret");
  const authorization_code = PropertiesService.getScriptProperties().getProperty("Authrization code");
  const basic_authorization = Utilities.base64Encode(client_id+":"+client_secret);

  // Spotify へのアクセストークンを取得
  const scriptProperties = PropertiesService.getScriptProperties();
  const is_first_access = Object.keys(scriptProperties.getProperties()).length == 0;
  const access_token = is_first_access ? getFirstAccessTokenToSpotify(authorization_code, basic_authorization) : scriptProperties.getProperty('access_token');

  const now_playing = getNowPlaying(access_token, basic_authorization);
  return now_playing
}

function getFirstAccessTokenToSpotify(authorization_code, basic_authorization) {
   const headers = { "Authorization": "Basic " + basic_authorization };
   const payload = {
     "grant_type": "authorization_code",
     "code": authorization_code,
     "redirect_uri": "http://localhost:3000"
   };
   const options = {
     "payload": payload,
     "headers": headers,
   };
   const response = UrlFetchApp.fetch("https://accounts.spotify.com/api/token", options);

   const parsedResponse = JSON.parse(response);
   const scriptProperties = PropertiesService.getScriptProperties();
   scriptProperties.setProperties({
    'access_token': parsedResponse.access_token,
    'refresh_token': parsedResponse.refresh_token
   });
   return parsedResponse.access_token;
}

function refreshAccessTokenToSpotify(basic_authorization) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const refresh_token = scriptProperties.getProperty('refresh_token');

  const headers = {
    "Authorization": "Basic " + basic_authorization,
    "Content-Type": "application/x-www-form-urlencoded"
  };
  const payload = {
     "grant_type": "refresh_token",
     "refresh_token": refresh_token
  };
  const options = {
    "payload": payload,
    "headers": headers,
  };
  const response = UrlFetchApp.fetch("https://accounts.spotify.com/api/token", options);

  const parsedResponse = JSON.parse(response);
  scriptProperties.setProperty('access_token', parsedResponse.access_token);
  // refresh_token は毎回発行されるとは限らない
  if (parsedResponse.refresh_token) {
    scriptProperties.setProperty('refresh_token', parsedResponse.refresh_token);
  }
  return parsedResponse.access_token;
}

function getNowPlaying(access_token, basic_authorization) {
   const options = {
     "headers": { "Authorization": "Bearer " + access_token },
     "muteHttpExceptions": true // 401エラーへの対応のため
   };
   const response = UrlFetchApp.fetch("https://api.spotify.com/v1/me/player", options);

   switch (response.getResponseCode()) {
     case 200: // Spotify の曲をセット
       return getArtistAndSongString(response);
     case 204: // 何も聞いていない
       var code = response.getResponseCode();
       return {code, code, code, code, code};
     case 401: // access_token が切れた
       const refreshed_access_token = refreshAccessTokenToSpotify(basic_authorization);
       return getNowPlaying(refreshed_access_token, basic_authorization);
     default:
       // 実行されない想定
   }
}

function getArtistAndSongString(response) {
   const parsedResponse = JSON.parse(response);
   const song = parsedResponse.item.name;
   const external_urls = parsedResponse.item.external_urls.spotify;
   const artist = parsedResponse.item.artists[0].name;

   var artist_2 = ""
   if(parsedResponse.item.artists.length > 1){
    artist_2 = parsedResponse.item.artists[1].name
   }
   if(parsedResponse.item.artists.length > 2){
    const other = parsedResponse.item.artists.length-2
    artist_2 = artist_2 + "、他" + other + "名"
   }   

   var device = parsedResponse.device.name;
   if(device == "iPhone"){
    device = "iPhone 13 mini";
   }else if(device == "TH-CENTIO"){
    device = "TH-CENTIO";
   }else if(device == "TH-VAIO"){
    device = "VAIO SX12";
   }else if(device == "TH-MACBOOK"){
    device = "MBA(11-inch, 2015)";
   }

   return {song, external_urls, artist, artist_2, device};
}