<?php
// /pvc/img-proxy.php
// Uso: /pvc/img-proxy.php?u=<url-encode-da-imagem>

if (!isset($_GET['u'])) { http_response_code(400); exit('Missing u'); }
$url = $_GET['u'];
// validações simples
if (!preg_match('#^https?://#i', $url)) { http_response_code(400); exit('Bad URL'); }
if (strlen($url) > 2000) { http_response_code(400); exit('URL too long'); }

$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT => 15,
  CURLOPT_USERAGENT => 'ImgProxy/1.0',
]);
$bin = curl_exec($ch);
$ctype = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code !== 200 || !$bin) { http_response_code(404); exit('Not found'); }

// normaliza content-type para imagem
if (!$ctype || stripos($ctype, 'image/') === false) {
  $ctype = 'image/*';
}
header('Content-Type: '.$ctype);
header('Cache-Control: public, max-age=31536000');
header('Access-Control-Allow-Origin: *'); // opcional
echo $bin;
