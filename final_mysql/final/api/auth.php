<?php
require_once '../config/database.php';
function verifyToken($token) {
    if (empty($token)) {
        return null;
    }
    
    // 连接数据库
    $database = new Database();
    $db = $database->getConnection();
    
    // 查询token是否有效
    $query = "SELECT id, username, email FROM users 
              WHERE auth_token = :token "; // 检查token是否过期
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":token", $token);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row; // 返回用户信息
    }
    
    return null;
}

function requireAuth() {
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : '';
    
    $user = verifyToken($token);
    
    if (!$user) {
        http_response_code(401);
        header('Content-Type: application/json; charset=UTF-8'); 
        echo json_encode(array("message" => "未授权访问"));
        //exit;
    }
    
    return $user['id'];
}
?>