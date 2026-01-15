<?php
class Database {
    private $db_path;
    public $conn;

    public function __construct() {
        // 设置数据库文件路径
        $this->db_path = __DIR__ . '/note_system.db';
        error_log("数据库文件路径: " . $this->db_path);
        
        // 确保目录存在
        $db_dir = dirname($this->db_path);
        if (!is_dir($db_dir)) {
            mkdir($db_dir, 0755, true);
        }
    }

    public function getConnection() {
        try {
            error_log("REAL DB PATH = " . realpath($this->db_path));

            // 检查文件是否存在，不存在则创建
            if (!file_exists($this->db_path)) {
                touch($this->db_path);
                error_log("创建数据库文件: " . $this->db_path);
            }
            
            // 连接SQLite数据库
            $this->conn = new PDO("sqlite:" . $this->db_path);
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->setAttribute(PDO::ATTR_TIMEOUT, 30);
            
            // 启用外键约束
            $this->conn->exec("PRAGMA foreign_keys = ON");
            $this->conn->exec("PRAGMA journal_mode = WAL");
            
            // 强制初始化数据库表
            $this->initializeTables();
            
            return $this->conn;
            
        } catch(PDOException $exception) {
            error_log("数据库错误: " . $exception->getMessage());
            error_log("文件路径: " . $this->db_path);
            error_log("文件权限: " . (is_writable($this->db_path) ? '可写' : '不可写'));
            
            // 返回更详细的错误信息
            throw new Exception("数据库连接失败: " . $exception->getMessage() . 
                              " | 路径: " . $this->db_path);
        }
    }


    /**
     * 初始化数据库表
     */
    private function initializeTables() {
        try {
            // 创建users表
            $this->conn->exec("
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    auth_token TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ");
            
            // 创建categories表
            $this->conn->exec("
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    category_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    icon TEXT DEFAULT 'fas fa-folder',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(user_id, name)
                )
            ");
            
            // 创建notes表
            $this->conn->exec("
                CREATE TABLE IF NOT EXISTS notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title TEXT DEFAULT '无标题笔记',
                    content TEXT,
                    category_id TEXT DEFAULT 'uncategorized',
                    tags TEXT,
                    client_id TEXT,
                    is_deleted INTEGER DEFAULT 0,
                    is_private INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
            
            // 创建user_settings表
            $this->conn->exec("
                CREATE TABLE IF NOT EXISTS user_settings (
                    user_id INTEGER PRIMARY KEY,
                    language TEXT DEFAULT 'zh-CN',
                    private_password TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            ");
            
            // 创建索引
            $indexes = [
                "CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_notes_category_id ON notes(category_id)",
                "CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_users_auth_token ON users(auth_token)",
                "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"
            ];
            
            foreach ($indexes as $sql) {
                $this->conn->exec($sql);
            }
            
            error_log("数据库表初始化完成");
            
            // 验证表是否创建成功
            $tables = ['users', 'categories', 'notes', 'user_settings'];
            foreach ($tables as $table) {
                $stmt = $this->conn->query("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='$table'");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                error_log("表 $table 存在: " . ($result['count'] > 0 ? '是' : '否'));
            }
            
        } catch (PDOException $e) {
            error_log("初始化表失败: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * 检查数据库是否需要初始化
     */
    public function needsInitialization() {
        try {
            $stmt = $this->conn->query("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            return $result['count'] == 0;
        } catch (Exception $e) {
            return true;
        }
    }
}
?>