<?php
class Database {
    private $host = "localhost";
    private $db_name = "note_system";  // 目标数据库名
    private $username = "root";
    private $password = "";
    public $conn;

    public function getConnection() {
        $this->conn = null;

        try {
            // Step 1: 连接 MySQL 服务器，不指定数据库名
            $this->conn = new PDO(
                "mysql:host=" . $this->host,
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->conn->exec("set names utf8mb4");

            // Step 2: 检查数据库是否存在
            $query = "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = :db_name";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':db_name', $this->db_name);
            $stmt->execute();

            // Step 3: 如果数据库不存在，先创建数据库
            if ($stmt->rowCount() == 0) {
                $createDbQuery = "CREATE DATABASE IF NOT EXISTS `" . $this->db_name . "` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
                $this->conn->exec($createDbQuery); // 创建数据库

                // Step 4: 使用新创建的数据库
                $this->conn->exec("use " . $this->db_name);
                
                // Step 5: 执行 SQL 文件中的创建表等语句
                $sqlFile = __DIR__.'/database.sql';  // 你的 SQL 文件路径
                $sql = file_get_contents($sqlFile); // 读取 SQL 文件内容
                $this->conn->exec($sql); // 执行 SQL 文件中的创建表语句
            } else {
                // Step 4: 如果数据库已经存在，直接使用数据库
                $this->conn->exec("use " . $this->db_name);
            }

        } catch(PDOException $exception) {
            echo "Connection error: " . $exception->getMessage();
        }
        return $this->conn;
    }
}
?>
