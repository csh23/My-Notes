<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once '../config/database.php';
require_once 'auth.php';

$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // 获取用户设置
        $user_id = requireAuth();
        
        $query = "SELECT language, private_password FROM user_settings WHERE user_id = :user_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();
        
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            
            $settings = array(
                "language" => $row['language'] ?? 'zh-CN',
                "private_password" => $row['private_password'] ?? null
            );
            
            echo json_encode(array(
                "success" => true,
                "settings" => $settings
            ));
        } else {
            // 如果没有设置记录，创建默认设置
            $query = "INSERT INTO user_settings (user_id, language) VALUES (:user_id, 'zh-CN')";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            
            if ($stmt->execute()) {
                echo json_encode(array(
                    "success" => true,
                    "settings" => array(
                        "language" => "zh-CN",
                        "private_password" => null
                    )
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "success" => false,
                    "message" => "创建设置失败"
                ));
            }
        }
        break;
        
    case 'POST':
    case 'PUT':
        // 更新用户设置
        $user_id = requireAuth();
        $data = json_decode(file_get_contents("php://input"));
        
        // 检查设置是否存在
        $checkQuery = "SELECT user_id FROM user_settings WHERE user_id = :user_id";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(":user_id", $user_id);
        $checkStmt->execute();
        
        if ($checkStmt->fetch()) {
            // 更新现有设置
            $updateFields = array();
            $params = array(":user_id" => $user_id);
            
            if (isset($data->language)) {
                $updateFields[] = "language = :language";
                $params[":language"] = $data->language;
            }
            
            if (isset($data->private_password)) {
                // 验证密码是否为4位数字
                if (!empty($data->private_password) && !preg_match('/^\d{4}$/', $data->private_password)) {
                    http_response_code(400);
                    echo json_encode(array(
                        "success" => false,
                        "message" => "私密密码必须是4位数字"
                    ));
                    exit;
                }
                
                $updateFields[] = "private_password = :private_password";
                $params[":private_password"] = !empty($data->private_password) ? $data->private_password : null;
            }
            
            if (count($updateFields) > 0) {
                $query = "UPDATE user_settings SET " . implode(", ", $updateFields) . 
                         " WHERE user_id = :user_id";
                $stmt = $db->prepare($query);
                
                foreach ($params as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
                
                if ($stmt->execute()) {
                    echo json_encode(array(
                        "success" => true,
                        "message" => "设置更新成功"
                    ));
                } else {
                    http_response_code(500);
                    echo json_encode(array(
                        "success" => false,
                        "message" => "更新设置失败"
                    ));
                }
            } else {
                echo json_encode(array(
                    "success" => true,
                    "message" => "没有需要更新的设置"
                ));
            }
        } else {
            // 创建新设置
            $query = "INSERT INTO user_settings (user_id, language, private_password) 
                      VALUES (:user_id, :language, :private_password)";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->bindValue(":language", $data->language ?? 'zh-CN');
            
            // 验证密码
            if (isset($data->private_password) && !empty($data->private_password)) {
                if (!preg_match('/^\d{4}$/', $data->private_password)) {
                    http_response_code(400);
                    echo json_encode(array(
                        "success" => false,
                        "message" => "私密密码必须是4位数字"
                    ));
                    exit;
                }
                $stmt->bindParam(":private_password", $data->private_password);
            } else {
                $stmt->bindValue(":private_password", null, PDO::PARAM_NULL);
            }
            
            if ($stmt->execute()) {
                echo json_encode(array(
                    "success" => true,
                    "message" => "设置创建成功"
                ));
            } else {
                http_response_code(500);
                echo json_encode(array(
                    "success" => false,
                    "message" => "创建设置失败"
                ));
            }
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(array("message" => "方法不允许"));
        break;
}