<?php
// /pvc_demo/api/upload.php
require __DIR__.'/db.php';
$user_id = require_login();

if (!isset($_FILES['file'])) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>'no_file']);
  exit;
}

$f = $_FILES['file'];
if ($f['error'] !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>'upload_error_'.$f['error']]);
  exit;
}

$allowed = ['image/png'=>'png','image/jpeg'=>'jpg','image/jpg'=>'jpg','image/webp'=>'webp'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime  = finfo_file($finfo, $f['tmp_name']);
finfo_close($finfo);

if (!isset($allowed[$mime])) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>'unsupported_type']);
  exit;
}

$ext = $allowed[$mime];
$size = (int)$f['size'];
if ($size > 5*1024*1024) { // 5MB
  http_response_code(400);
  echo json_encode(['ok'=>false,'error'=>'too_big']);
  exit;
}

// Diretório do utilizador
$baseDir = dirname(__DIR__).'/uploads';         // /pvc_demo/uploads
$userDir = $baseDir.'/'.$user_id;
if (!is_dir($userDir)) { mkdir($userDir, 0775, true); }

// Nome único (evita cache do browser)
$slug = date('Ymd_His').'_' . bin2hex(random_bytes(4));
$filename = $slug.'.'.$ext;
$destPath = $userDir.'/'.$filename;

if (!move_uploaded_file($f['tmp_name'], $destPath)) {
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'move_failed']);
  exit;
}

// Guarda na BD
$relPath = 'uploads/'.$user_id.'/'.$filename; // relativo à docroot
$stmt = $pdo->prepare('INSERT INTO files (user_id, path, original_name, mime, size_bytes) VALUES (?,?,?,?,?)');
$stmt->execute([$user_id, $relPath, $f['name'], $mime, $size]);

// Cabeçalhos do lado do ficheiro estático (opcional via .htaccess) podem ter long cache.
// Para garantir refresh, o URL já é único. Se quiseres ainda cache-busting, podes devolver ?v=timestamp.
echo json_encode(['ok'=>true, 'url'=>'/pvc_demo/'.$relPath]);
