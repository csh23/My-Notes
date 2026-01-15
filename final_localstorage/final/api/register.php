<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->username) && !empty($data->email) && !empty($data->password)) {
    // 检查用户名和邮箱是否已存在
    $query = "SELECT id FROM users WHERE username = :username OR email = :email";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":username", $data->username);
    $stmt->bindParam(":email", $data->email);
    $stmt->execute();
    
    if ($stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(array("message" => "用户名或邮箱已存在"));
        exit;
    }
    
    // 创建用户
    $password_hash = password_hash($data->password, PASSWORD_BCRYPT);
    $query = "INSERT INTO users (username, email, password_hash) VALUES (:username, :email, :password_hash)";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":username", $data->username);
    $stmt->bindParam(":email", $data->email);
    $stmt->bindParam(":password_hash", $password_hash);
    
    if ($stmt->execute()) {
        $user_id = $db->lastInsertId();
        
        // 创建用户设置
        $query = "INSERT INTO user_settings (user_id) VALUES (:user_id)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();
        
        // 创建默认分类
        $default_categories = [
            ['uncategorized', '未分类'],
            ['private', '私密'],
            ['deleted', '最近删除']
        ];
        
        foreach ($default_categories as $category) {
            $query = "INSERT INTO categories (user_id, category_id, name) VALUES (:user_id, :category_id, :name)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindParam(":category_id", $category[0]);
            $stmt->bindParam(":name", $category[1]);
            $stmt->execute();
        }
        
        http_response_code(201);
        echo json_encode(array(
            "success" => true,
            "message" => "用户注册成功",
            "user_id" => $user_id
        ));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "无法创建用户"));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "数据不完整"));
}
?>