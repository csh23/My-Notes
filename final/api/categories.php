<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

require_once '../config/database.php';
require_once 'auth.php';

$database = new Database();
$db = $database->getConnection();
$method = $_SERVER['REQUEST_METHOD'];

// 获取用户ID
$user_id = requireAuth();

switch ($method) {
    case 'GET':
        // 获取用户的所有分类
        $query = "SELECT category_id, name, icon FROM categories WHERE user_id = :user_id ORDER BY created_at DESC";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();
        
        $categories = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $categories[] = array(
                "id" => $row['category_id'],
                "name" => $row['name'],
                "notes" => [] // 空数组，前端会填充
            );
        }
        
        // 返回数据，包含自定义分类
        echo json_encode(array(
            "success" => true,
            "categories" => $categories
        ));
        break;
        
    case 'POST':
        // 创建新分类
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->name)) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "分类名称不能为空"
            ));
            exit;
        }
        
        // 检查分类名称是否已存在
        $checkQuery = "SELECT category_id FROM categories WHERE user_id = :user_id AND name = :name";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(":user_id", $user_id);
        $checkStmt->bindParam(":name", $data->name);
        $checkStmt->execute();
        
        if ($checkStmt->fetch()) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "分类名称已存在"
            ));
            exit;
        }
        
        // 生成分类ID
        $category_id = "cat_" . uniqid();
        
        // 插入新分类
        $query = "INSERT INTO categories (user_id, category_id, name) 
                  VALUES (:user_id, :category_id, :name)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":category_id", $category_id);
        $stmt->bindParam(":name", $data->name);
        
        if ($stmt->execute()) {
            echo json_encode(array(
                "success" => true,
                "message" => "分类创建成功",
                "category" => array(
                    "id" => $category_id,
                    "name" => $data->name,
                    "notes" => []
                )
            ));
        } else {
            http_response_code(500);
            echo json_encode(array(
                "success" => false,
                "message" => "创建分类失败"
            ));
        }
        break;
        
    case 'PUT':
        // 更新分类（重命名）
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->categoryId) || empty($data->newName)) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "分类ID和新名称不能为空"
            ));
            exit;
        }
        
        // 检查是否是默认分类（不能修改）
        if (in_array($data->categoryId, ['uncategorized', 'private', 'deleted'])) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "不能修改默认分类"
            ));
            exit;
        }
        
        // 检查分类是否存在
        $checkQuery = "SELECT category_id FROM categories 
                       WHERE user_id = :user_id AND category_id = :category_id";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(":user_id", $user_id);
        $checkStmt->bindParam(":category_id", $data->categoryId);
        $checkStmt->execute();
        
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(array(
                "success" => false,
                "message" => "分类不存在"
            ));
            exit;
        }
        
        // 检查新名称是否已存在
        $nameCheckQuery = "SELECT category_id FROM categories 
                           WHERE user_id = :user_id AND name = :name AND category_id != :category_id";
        $nameCheckStmt = $db->prepare($nameCheckQuery);
        $nameCheckStmt->bindParam(":user_id", $user_id);
        $nameCheckStmt->bindParam(":name", $data->newName);
        $nameCheckStmt->bindParam(":category_id", $data->categoryId);
        $nameCheckStmt->execute();
        
        if ($nameCheckStmt->fetch()) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "分类名称已存在"
            ));
            exit;
        }
        
        // 更新分类名称
        $query = "UPDATE categories SET name = :name WHERE user_id = :user_id AND category_id = :category_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":category_id", $data->categoryId);
        $stmt->bindParam(":name", $data->newName);
        
        if ($stmt->execute()) {
            echo json_encode(array(
                "success" => true,
                "message" => "分类更新成功"
            ));
        } else {
            http_response_code(500);
            echo json_encode(array(
                "success" => false,
                "message" => "更新分类失败"
            ));
        }
        break;
        
    case 'DELETE':
        // 删除分类
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->categoryId)) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "分类ID不能为空"
            ));
            exit;
        }
        
        // 检查是否是默认分类（不能删除）
        if (in_array($data->categoryId, ['uncategorized', 'private', 'deleted'])) {
            http_response_code(400);
            echo json_encode(array(
                "success" => false,
                "message" => "不能删除默认分类"
            ));
            exit;
        }
        
        // 检查分类是否存在
        $checkQuery = "SELECT category_id FROM categories 
                       WHERE user_id = :user_id AND category_id = :category_id";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(":user_id", $user_id);
        $checkStmt->bindParam(":category_id", $data->categoryId);
        $checkStmt->execute();
        
        if (!$checkStmt->fetch()) {
            http_response_code(404);
            echo json_encode(array(
                "success" => false,
                "message" => "分类不存在"
            ));
            exit;
        }
        
        // 开始事务
        $db->beginTransaction();
        
        try {
            // 1. 将该分类下的笔记移动到"未分类"
            $updateNotesQuery = "UPDATE notes SET category_id = 'uncategorized' 
                                 WHERE user_id = :user_id AND category_id = :category_id";
            $updateStmt = $db->prepare($updateNotesQuery);
            $updateStmt->bindParam(":user_id", $user_id);
            $updateStmt->bindParam(":category_id", $data->categoryId);
            $updateStmt->execute();
            
            // 2. 删除分类
            $deleteQuery = "DELETE FROM categories 
                            WHERE user_id = :user_id AND category_id = :category_id";
            $deleteStmt = $db->prepare($deleteQuery);
            $deleteStmt->bindParam(":user_id", $user_id);
            $deleteStmt->bindParam(":category_id", $data->categoryId);
            $deleteStmt->execute();
            
            // 提交事务
            $db->commit();
            
            echo json_encode(array(
                "success" => true,
                "message" => "分类删除成功，相关笔记已移动到未分类"
            ));
        } catch (Exception $e) {
            // 回滚事务
            $db->rollBack();
            
            http_response_code(500);
            echo json_encode(array(
                "success" => false,
                "message" => "删除分类失败：" . $e->getMessage()
            ));
        }
        break;
        
    default:
        http_response_code(405);
        echo json_encode(array("message" => "方法不允许"));
        break;
}