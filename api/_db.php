<?php
// pvc_demo/api/_db.php
declare(strict_types=1);

const DB_HOST = 'localhost';                // normalmente localhost em cPanel
const DB_NAME = 'janely_cool';      // <- AJUSTA
const DB_USER = 'janely_cool';       // <- AJUSTA
const DB_PASS =  'P%KxuVcSYMox';    // <- AJUSTA


function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;

  $dsn = 'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4';
  $pdo = new PDO($dsn, DB_USER, DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
  ]);
  return $pdo;
}
