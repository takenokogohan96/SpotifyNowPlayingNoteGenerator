//https://qiita.com/nozomit/items/0bec86a08f967aaa0762

function popup() {
  var {song, external_urls, artist, artist_2, device} = generate_sharelink()
  var text;
  var plaintext;
  
  song = song.replace("&",'&amp;').replace("'","&#39;").replace('"','&#34;');
  artist = artist.replace("&",'&amp;').replace("'","&#39;").replace('"','&#34;');

  if(artist_2 == ""){
    text = "🎵%20[" + song + "](" + external_urls + ")%0A🎤%20" + artist + "%0A%3Csmall%3E%23nowplaying%20|%20" + device + "%3C/small%3E";
    plaintext = "🎵 [" + song + "](" + external_urls + ")<br>🎤 " + artist + "<br>&lt;small&gt;#nowplaying | " + device + "&lt;/small&gt;"
  }else{
    artist_2 = artist.replace("&",'&amp;').replace("'","&#39;").replace('"','&#34;');
    text = "🎵%20[" + song + "](" + external_urls + ")%0A🎤%20" + artist + "%0A🎤%20" + artist_2 + "%0A%3Csmall%3E%23nowplaying%20|%20" + device + "%3C/small%3E";
    plaintext = "🎵 [" + song + "](" + external_urls + ")<br>🎤 " + artist + "<br>🎤 " + artist_2 +"<br>&lt;small&gt;#nowplaying | " + device + "&lt;/small&gt;"
  }
  var url_1 = "https://misskey.io/share?text=" + text;
  var url_2 = "https://live-theater.net/share?text=" + text;
  
  var script = "<a href='" +url_1+ "' target='window.open'>misskey.io</a><br><a href='" +url_2+ "' target='window.open'>live-theater.net</a><br><br>"+ plaintext;
  var html = HtmlService.createHtmlOutput(script);
  FormApp.getUi().showModalDialog(html, '投稿先サーバ');

}

function generate_sharelink() {
  // ******************
  // ここから下を個別に設定
  const client_id = "5949e42842b64a139732ca7c61014d77";
  const client_secret = "8f686e1f968f45c6b92695519d2636d5";
  const authorization_code = "AQBE-B6wLqPvn8uFFeEWGezcb9Q7PNW4p-FS08_WATcykJvN59p5e7XKRItQJkRHaobKxhg8KRm1BZCt8U-ws7hoWWGY49Euv4y-G1AXa9OoFexOHUPKgmK6IeYPe5Apj7g3sN693wurMGAYl8ANVWhjgf6BrvDrIzI_-KUbAUWLrredU-faxEcIwFXOEyjIlnEB";
  const basic_authorization = Utilities.base64Encode(client_id+":"+client_secret); // 変更不要
  // ここから上を個別に設定
  // ******************

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
       return null;
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
    device = "MBA(11-inch, Early 2015)";
   }

   return {song, external_urls, artist, artist_2, device};
}







