<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();


$data = json_decode(file_get_contents("php://input"));


if (!empty($data->username) && !empty($data->password)) {
    // $stmt = $db->query("SELECT id, username, email FROM users where username = 'Csh23'");
    // $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // error_log("USERS IN DB = " . json_encode($rows));

    // $input = trim($data->username);  // 用户输入的可以是用户名或邮箱
    // $query = "SELECT id, username, email, password_hash
    //         FROM users
    //         WHERE username = 'Csh23'
    //         LIMIT 1";
    // $stmt = $db->query($query);
    // // $stmt->bindValue(":input", $input);
    // $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // error_log("USERS IN DB = " . json_encode($rows));

    // $stmt->execute();

    $rawInput = $data->username;   // 对象属性
    $input = strval($rawInput);    // 强制转成标准字符串
    $input = trim($input);

    $query = "SELECT id, username, email, password_hash 
            FROM users
            WHERE username = :input
            LIMIT 1";

    $stmt = $db->query($query);
    $stmt->bindValue(":input", $input, PDO::PARAM_STR);
    $stmt->execute();
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    error_log("USERS IN DB = " . json_encode($row));

    if ($row) {
        if (password_verify($data->password, $row['password_hash'])) {
            // 生成token（简化版，生产环境应使用JWT）
            $token = bin2hex(random_bytes(32));
            $expiry = time() + (7 * 24 * 60 * 60); // 7天有效期

            // 将token存入数据库
            $updateQuery = "UPDATE users SET auth_token = :token WHERE id = :user_id";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->bindParam(":token", $token);
            //$updateStmt->bindParam(":expiry", $expiry);
            $updateStmt->bindParam(":user_id", $row['id']);
            $updateStmt->execute();
            
            // 获取用户设置
            $query_settings = "SELECT language, private_password FROM user_settings WHERE user_id = :user_id";
            $stmt_settings = $db->prepare($query_settings);
            $stmt_settings->bindParam(":user_id", $row['id']);
            $stmt_settings->execute();
            $settings = $stmt_settings->fetch(PDO::FETCH_ASSOC);
            

            // 响应数据
            http_response_code(200);
            echo json_encode(array(
                "message" => "登录成功",
                "token" => $token,
                "user" => array(
                    "id" => $row['id'],
                    "username" => $row['username'],
                    "email" => $row['email']
                ),
                "settings" => $settings
            ));
        } else {
            http_response_code(401);
            echo json_encode(array("message" => "密码错误"));
        }
    } else {
        http_response_code(404);
        echo json_encode(array("message" => "用户不存在"));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "数据不完整"));
}
?>