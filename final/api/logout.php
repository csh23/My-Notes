<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once '../config/database.php';
require_once 'auth.php';

$database = new Database();
$db = $database->getConnection();

// 获取当前用户ID
$user_id = requireAuth();

// 清除用户的token
$query = "UPDATE users SET auth_token = NULL WHERE id = :user_id";
$stmt = $db->prepare($query);
$stmt->bindParam(":user_id", $user_id);
$stmt->execute();

http_response_code(200);
echo json_encode(array("message" => "登出成功"));
?>