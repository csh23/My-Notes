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

// if ($method === 'OPTIONS') {
//     http_response_code(200); // 必须返回 204 或 200
//     exit();
// }

switch ($method) {
    case 'GET':
        $user_id = requireAuth();
        
        $query = "SELECT * FROM notes WHERE user_id = :user_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->execute();
        
        $notes = array();
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $notes[] = array(
                "id" => "note_" . $row['id'],
                "title" => $row['title'],
                "content" => $row['content'],
                "categoryId" => $row['category_id'],
                "createdAt" => $row['created_at'],
                "updatedAt" => $row['updated_at'],
                "tags" => json_decode($row['tags'] ?: '[]', true),
                "isPrivate" => (bool)$row['is_private']
            );
        }
        
        echo json_encode(array("notes" => $notes));
        break;
        
    case 'POST':
        $user_id = requireAuth();
        $data = json_decode(file_get_contents("php://input"));
        $client_id = $data->id;
        
        $query = "INSERT INTO notes (user_id, title, content, category_id, tags, client_id) 
                    VALUES (:user_id, :title, :content, :category_id, :tags, :client_id)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":title", $data->title);
        $stmt->bindParam(":content", $data->content);
        $stmt->bindParam(":category_id", $data->categoryId);
        $stmt->bindParam(":client_id", $client_id);
        $stmt->bindParam(":tags", json_encode($data->tags ?: []));
        
        if ($stmt->execute()) {
            echo json_encode(array(
                "message" => "笔记创建成功",
                "note_id" => $client_id
            ));
        }
        break;
        
    case 'DELETE':
        // 删除笔记（默认软删除，可以通过参数控制）
        $user_id = requireAuth();
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->id)) {
            http_response_code(400);
            echo json_encode(array("message" => "笔记ID不能为空"));
            exit;
        }
        
        // 从笔记ID中提取数据库ID
        $note_id = extractNoteId($data->id);
        
        // 检查是否是永久删除
        $permanent = isset($data->permanent) && $data->permanent === true;
        
         // 检查是否是恢复操作
        $restore = isset($data->restore) && $data->restore === true;

        if ($restore) {
            // 恢复笔记
            return restoreNote($db, $user_id, $note_id);
        } else if ($permanent) {
            // 永久删除（硬删除）
            return permanentlyDeleteNote($db, $user_id, $note_id);
        } else {
            // 软删除
            return softDeleteNote($db, $user_id, $note_id);
        }
        break;

    case 'PUT':
        $user_id = requireAuth();
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->id)) {
            http_response_code(400);
            echo json_encode(array("message" => "笔记ID不能为空"));
            exit;
        }
        
        $note_id = extractNoteId($data->id);
        
        // 恢复笔记
        return restoreNote($db, $user_id, $note_id);
        break;

    case 'PATCH':
        $user_id = requireAuth();
        $data = json_decode(file_get_contents("php://input"));
        
        if (empty($data->id)) {
            http_response_code(400);
            echo json_encode(array("message" => "笔记ID不能为空"));
            exit;
        }
        
        // 提取数据库ID
        $note_id = extractNoteId($data->id);
        
        // 检查笔记是否存在且属于当前用户
        $checkQuery = "SELECT id FROM notes WHERE id = :id AND user_id = :user_id";
        $checkStmt = $db->prepare($checkQuery);
        $checkStmt->bindParam(":id", $note_id);
        $checkStmt->bindParam(":user_id", $user_id);
        $checkStmt->execute();
        
        if ($checkStmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(array("message" => "笔记不存在或无权限访问"));
            exit;
        }
        
        // 更新笔记
        $query = "UPDATE notes SET 
                    title = :title, 
                    content = :content, 
                    category_id = :category_id, 
                    tags = :tags, 
                    updated_at = NOW() 
                WHERE id = :id AND user_id = :user_id";
        
        $stmt = $db->prepare($query);
        $stmt->bindParam(":id", $note_id);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":title", $data->title);
        $stmt->bindParam(":content", $data->content);
        $stmt->bindParam(":category_id", $data->categoryId);
        $stmt->bindParam(":tags", json_encode($data->tags ?: []));
        
        if ($stmt->execute()) {
            echo json_encode(array(
                "message" => "笔记更新成功",
                "note_id" => $data->id
            ));
        } else {
            http_response_code(500);
            echo json_encode(array("message" => "更新笔记失败"));
        }
        break;
}

/**
 * 从笔记ID中提取数据库ID
 */
function extractNoteId($note_id) {
    if (strpos($note_id, 'note_') === 0) {
        return substr($note_id, 5);
    }
    return $note_id;
}

/**
 * 软删除笔记
 */
function softDeleteNote($db, $user_id, $note_id) {
    // 检查笔记是否存在且属于当前用户且未删除
    $checkQuery = "SELECT id FROM notes WHERE id = :id AND user_id = :user_id AND is_deleted = 0";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(":id", $note_id);
    $checkStmt->bindParam(":user_id", $user_id);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(array("message" => "笔记不存在或无权限访问"));
        exit;
    }
    
    // 软删除：将is_deleted设置为1
    $query = "UPDATE notes SET category_id = 'deleted', is_deleted = 1,updated_at = NOW() WHERE id = :id AND user_id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":id", $note_id);
    $stmt->bindParam(":user_id", $user_id);
    
    if ($stmt->execute()) {
        echo json_encode(array(
            "message" => "笔记已移动到回收站"
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "删除笔记失败"));
    }
}

/**
 * 永久删除笔记（硬删除）
 */
function permanentlyDeleteNote($db, $user_id, $note_id) {
    // 检查笔记是否存在且属于当前用户
    $checkQuery = "SELECT id FROM notes WHERE id = :id AND user_id = :user_id";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(":id", $note_id);
    $checkStmt->bindParam(":user_id", $user_id);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(array("message" => "笔记不存在或无权限访问"));
        exit;
    }
    
    // 永久删除：直接从数据库中删除记录
    $query = "DELETE FROM notes WHERE id = :id AND user_id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":id", $note_id);
    $stmt->bindParam(":user_id", $user_id);
    
    if ($stmt->execute()) {
        echo json_encode(array(
            "message" => "笔记已永久删除"
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "永久删除笔记失败"));
    }
}

/**
 * 恢复已删除的笔记
 */
function restoreNote($db, $user_id, $note_id) {
    // 检查笔记是否存在且属于当前用户且已删除
    $checkQuery = "SELECT id, category_id FROM notes WHERE id = :id AND user_id = :user_id AND is_deleted = 1";
    $checkStmt = $db->prepare($checkQuery);
    $checkStmt->bindParam(":id", $note_id);
    $checkStmt->bindParam(":user_id", $user_id);
    $checkStmt->execute();
    
    if ($checkStmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(array("message" => "笔记不存在或无法恢复"));
        exit;
    }
    
    $row = $checkStmt->fetch(PDO::FETCH_ASSOC);
    $original_category = $row['category_id'];
    
    // 恢复笔记：将is_deleted设置为0，如果原分类是"deleted"则恢复为"uncategorized"
    $target_category = ($original_category === 'deleted') ? 'uncategorized' : $original_category;
    
    $query = "UPDATE notes SET is_deleted = 0, category_id = :target_category, updated_at = NOW() WHERE id = :id AND user_id = :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":id", $note_id);
    $stmt->bindParam(":user_id", $user_id);
    $stmt->bindParam(":target_category", $target_category);
    
    if ($stmt->execute()) {
        echo json_encode(array(
            "message" => "笔记已恢复",
            "note_id" => "note_" . $note_id,
            "category_id" => $target_category
        ));
    } else {
        http_response_code(500);
        echo json_encode(array("message" => "恢复笔记失败"));
    }
}
?>