<?php
class Contact {
    private $db;

    public function __construct() {
        $this->db = new Database;
    }

    public function addMessage($data) {
        $this->db->query('INSERT INTO contact_messages (name, email, message) VALUES(:name, :email, :message)');
        $this->db->bind(':name', $data['name']);
        $this->db->bind(':email', $data['email']);
        $this->db->bind(':message', $data['message']);

        return $this->db->execute();
    }

    // Method added to resolve the "Call to undefined method" error
    public function getMessages() {
        $this->db->query('SELECT * FROM contact_messages ORDER BY created_at DESC');
        return $this->db->resultSet();
    }
}