<?php
class MaintenanceModel {
    private PDO $db;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function getServicesByGroup(string $group): array {
        $stmt = $this->db->prepare("SELECT * FROM services WHERE category = ?");
        $stmt->execute([$group]);
        return $stmt->fetchAll();
    }

    public function createBooking(array $data): bool {
        $sql = "INSERT INTO bookings (user_id, service_id, customer_name, customer_email, customer_phone, appointment_date, device_details, status) 
                VALUES (:user_id, :service_id, :customer_name, :customer_email, :customer_phone, :appointment_date, :device_details, 'pending')";
        
        $stmt = $this->db->prepare($sql);
        return $stmt->execute([
            ':user_id'          => $data['user_id'],
            ':service_id'       => $data['service_id'],
            ':customer_name'    => $data['customer_name'],
            ':customer_email'   => $data['customer_email'],
            ':customer_phone'   => $data['customer_phone'],
            ':appointment_date' => $data['appointment_date'],
            ':device_details'   => $data['device_details']
        ]);
    }

    /**
     * Retrieve all maintenance bookings for the admin queue
     */
    public function getAllBookings(): array {
        $stmt = $this->db->query("SELECT * FROM bookings ORDER BY appointment_date DESC");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Update the status of a specific booking
     */
    public function updateBookingStatus(int $id, string $status): bool {
        $stmt = $this->db->prepare("UPDATE bookings SET status = ? WHERE id = ?");
        return $stmt->execute([$status, $id]);
    }
}