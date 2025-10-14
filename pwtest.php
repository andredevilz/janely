<?php
// pvc_demo/api/pwtest.php
header('Content-Type: text/plain; charset=utf-8');

$EMAIL = 'admin@demo.pt';
$TRY   = '0@Shark321#'; // muda para a password que queres usar

// === LIGAÇÃO BD (ajusta credenciais do teu cPanel) ===
$dsn = 'mysql:host=localhost;dbname=wwwdevcenter_pvc_demo;charset=utf8mb4';
$user = 'wwwdevcenter_pvc_demo';
$pass = '~bej0tASF?K9';



try {
  $pdo = new PDO($dsn, $user, $pass, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
} catch (Exception $e) {
  http_response_code(500);
  echo "ERRO LIGACAO: ".$e->getMessage();
  exit;
}

$stmt = $pdo->prepare("SELECT id, email, pass_hash FROM users WHERE email = ?");
$stmt->execute([$EMAIL]);
$row = $stmt->fetch();

if (!$row) { echo "UTILIZADOR NAO ENCONTRADO\n"; exit; }

echo "Email: {$row['email']}\nHash: {$row['pass_hash']}\n";
echo "password_verify? ".(password_verify($TRY, $row['pass_hash']) ? "OK" : "FALHA")."\n";
