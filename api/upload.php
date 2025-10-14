<?php
declare(strict_types=1);
require __DIR__.'/_session.php';
require_login_json();

header('Content-Type: application/json; charset=utf-8');

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>'no_file']); exit;
}

$uid = current_user_id();
$ext = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
$allowed = ['jpg','jpeg','png','gif','webp'];
if (!in_array($ext,$allowed,true)) { echo json_encode(['ok'=>false,'error'=>'invalid_type']); exit; }

$dir = __DIR__.'/../uploads/'.$uid;
if (!is_dir($dir)) mkdir($dir, 0775, true);

$base = bin2hex(random_bytes(8)).'.'.$ext;
$dest = $dir.'/'.$base;
if (!move_uploaded_file($_FILES['file']['tmp_name'], $dest)) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'move_failed']); exit;
}

// URL pública
$publicUrl = '/pvc_demo/uploads/'.$uid.'/'.$base;
echo json_encode(['ok'=>true, 'url'=>$publicUrl]);
