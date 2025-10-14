<?php
session_start();
if (!isset($_SESSION['user_id'])) {
  // enquanto não há login, força user_id=1 (o admin que inseriste acima)
  $_SESSION['user_id'] = 1;
}
function require_user_id(){
  if (empty($_SESSION['user_id'])) { http_response_code(401); exit(json_encode(['ok'=>false,'error'=>'no_session'])); }
  return (int)$_SESSION['user_id'];
}
header('Content-Type: application/json; charset=utf-8');
