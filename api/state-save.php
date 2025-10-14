<?php
declare(strict_types=1);
require __DIR__.'/_db.php';
require __DIR__.'/_session.php';
require_login_json();

header('Content-Type: application/json; charset=utf-8');

$uid = current_user_id();
$body = json_decode(file_get_contents('php://input'), true) ?: [];

$state = [
  'config'   => $body['config']   ?? null,
  'company'  => $body['company']  ?? null,
  'proposal' => $body['proposal'] ?? null,
  'items'    => $body['items']    ?? [],
];

$js = json_encode($state, JSON_UNESCAPED_UNICODE);

db()->beginTransaction();
try{
  // upsert
  $sql = "INSERT INTO user_state (user_id, json_state, updated_at)
          VALUES (?, ?, NOW())
          ON DUPLICATE KEY UPDATE json_state = VALUES(json_state), updated_at = VALUES(updated_at)";
  $st = db()->prepare($sql);
  $st->execute([$uid, $js]);
  db()->commit();
  echo json_encode(['ok'=>true]);
}catch(Throwable $e){
  db()->rollBack();
  http_response_code(500);
  echo json_encode(['ok'=>false,'error'=>'db_error','msg'=>$e->getMessage()]);
}
