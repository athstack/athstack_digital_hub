<?php
class Database {
    private static ?PDO $instance = null;
    private $stmt;

    // Static method for connection
    public static function getConnection(): PDO {
        if (self::$instance === null) {
            try {
                $dsn = "mysql:host=localhost;dbname=athstack_digital_hub;charset=utf8mb4";
                self::$instance = new PDO($dsn, "root", "1964", [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]);
            } catch (PDOException $e) {
                die("Database Connection Failed: " . $e->getMessage());
            }
        }
        return self::$instance;
    }

    // Instance wrapper methods
    public function query($sql) {
        $this->stmt = self::getConnection()->prepare($sql);
    }

    public function bind($param, $value) {
        $this->stmt->bindValue($param, $value);
    }

    public function execute() {
        return $this->stmt->execute();
    }

    // New method to fetch all results
    public function resultSet() {
        $this->execute();
        return $this->stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}