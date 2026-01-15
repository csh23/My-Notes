<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");

require_once '../config/database.php';

// 连接数据库
$database = new Database();
$db = $database->getConnection();

// token 验证函数
function verifyToken($db, $token) {
    if (empty($token)) {
        return false;
    }
    
    // 查询数据库验证 token
    $query = "SELECT id, username, email FROM users 
              WHERE auth_token = :token";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":token", $token);
    $stmt->execute();
    
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    error_log('checkdatabasetoken'.json_encode($row));
    if($row) {
        return array(
            "id" => $row['id'],
            "username" => $row['username'],
            "email" => $row['email']
        );
    }
    
    return false;
}

// 获取请求头
$headers = getallheaders();
$token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : '';

// 如果没有 token
if (empty($token)) {
    http_response_code(401);
    echo json_encode(array(
        "authenticated" => false,
        "message" => "未提供认证令牌"
    ));
    exit;
}

// 验证 token
$user = verifyToken($db, $token);

if ($user) {
    // 返回真实的用户信息
    echo json_encode(array(
        "authenticated" => true,
        "user" => array(
            "id" => $user['id'],
            "username" => $user['username'],
            "email" => $user['email']
        ),
        "message" => "认证成功"
    ));
} else {
    http_response_code(401);
    echo json_encode(array(
        "authenticated" => false,
        "message" => "认证令牌无效"
    ));
}
?>