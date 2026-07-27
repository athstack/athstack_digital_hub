<?php
class AuthController extends Controller {
    // Note: We no longer need the private PDO $db variable here 
    // because our UserModel handles its own database connection natively!

    public function __construct() {
        // Safe to leave empty since your config/autoload.php manages model instances dynamically
    }

    /**
     * Handles User Session Authentication
     */
    public function login(): void {
        // If already authenticated, bypass login gate
        if (isset($_SESSION['user_id'])) {
            $this->redirectBasedOnRole($_SESSION['user_role']);
        }

        $error = '';

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            // Anti-CSRF Token Security Validation
            if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
                die('Security violation: Invalid CSRF access token.');
            }

            $email = trim($_POST['email']);
            $password = trim($_POST['password']);

            if (!empty($email) && !empty($password)) {
                
                // --- 1. MODEL INTEGRATION POINT ---
                // We instantiate your new model and call findUserByEmail
                $userModel = new UserModel();
                $user = $userModel->findUserByEmail($email);

                // Initialize fallback schema variables to normalize Array vs Object returns
                $dbPassword = '';
                $userStatus = '';
                $userId     = null;
                $userRole   = '';
                $firstName  = '';
                $lastName   = '';

                if ($user) {
                    if (is_object($user)) {
                        $dbPassword = $user->password ?? '';
                        $userStatus = $user->status ?? '';
                        $userId     = $user->id ?? null;
                        $userRole   = $user->role ?? '';
                        $firstName  = $user->first_name ?? '';
                        $lastName   = $user->last_name ?? '';
                    } elseif (is_array($user)) {
                        $dbPassword = $user['password'] ?? '';
                        $userStatus = $user['status'] ?? '';
                        $userId     = $user['id'] ?? null;
                        $userRole   = $user['role'] ?? '';
                        $firstName  = $user['first_name'] ?? '';
                        $lastName   = $user['last_name'] ?? '';
                    }
                }

                // Verify cryptographic password signature match
                if ($user && password_verify($password, $dbPassword)) {
                    if ($userStatus !== 'active') {
                        $error = 'This account profile node has been suspended or is pending activation.';
                    } else {
                        // Establish Secure Session States
                        $_SESSION['user_id'] = $userId;
                        $_SESSION['user_name'] = trim($firstName . ' ' . $lastName);
                        $_SESSION['user_email'] = $email;
                        $_SESSION['user_role'] = $userRole;

                        $this->redirectBasedOnRole($userRole);
                    }
                } else {
                    $error = 'Invalid credential combinations matching our records.';
                }
            } else {
                $error = 'Please fill out all operational authentication inputs.';
            }
        }

        $this->view('auth/login', [
            'title' => 'Access Authorization - Athstack',
            'error' => $error
        ]);
    }

    /**
     * Handles New Client Account Node Registrations
     */
    public function register(): void {
        if (isset($_SESSION['user_id'])) {
            $this->redirectBasedOnRole($_SESSION['user_role']);
        }

        $error = '';

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (!isset($_POST['csrf_token']) || $_POST['csrf_token'] !== $_SESSION['csrf_token']) {
                die('Security violation: Invalid CSRF access token.');
            }

            $firstName = trim($_POST['first_name']);
            $lastName  = trim($_POST['last_name']);
            $email     = trim($_POST['email']);
            $phone     = trim($_POST['phone']);
            $password  = $_POST['password'];
            $confirm   = $_POST['confirm_password'];

            // Validation Engine Checks
            if ($password !== $confirm) {
                $error = 'Security check failed: Passwords do not match.';
            } elseif (strlen($password) < 8) {
                $error = 'Password density must be at least 8 characters long.';
            } else {
                
                // --- 2. MODEL INTEGRATION POINT ---
                $userModel = new UserModel();
                
                // Check if email node already exists via the model
                if ($userModel->findUserByEmail($email)) {
                    $error = 'This email node address is already registered inside our ecosystem.';
                } else {
                    // Hash Password using standard secure production encryption
                    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

                    // Package up our structured registration payload
                    $registrationData = [
                        'first_name' => $firstName,
                        'last_name'  => $lastName,
                        'email'      => $email,
                        'phone'      => $phone,
                        'password'   => $hashedPassword
                    ];

                    // --- 3. MODEL INTEGRATION POINT ---
                    // Save user information through our data mapping layout layer
                    if ($userModel->register($registrationData)) {
                        
                        // We fetch the newly inserted user profile array to extract its fresh database ID
                        $newUser = $userModel->findUserByEmail($email);

                        // Normalize fields for auto-login tracking variables
                        $newId = is_object($newUser) ? ($newUser->id ?? null) : ($newUser['id'] ?? null);

                        // Auto-authenticate user immediately following registration success
                        $_SESSION['user_id'] = $newId;
                        $_SESSION['user_name'] = $firstName . ' ' . $lastName;
                        $_SESSION['user_email'] = $email;
                        $_SESSION['user_role'] = 'customer';

                        header('Location: ' . URLROOT . '/user');
                        exit;
                    } else {
                        $error = 'Internal deployment crash. Account node initialization failed.';
                    }
                }
            }
        }

        $this->view('auth/register', [
            'title' => 'Initialize Profile Node - Athstack',
            'error' => $error
        ]);
    }

    /**
     * Terminates Application Active Session Matrix
     */
    public function logout(): void {
        $_SESSION = [];
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        session_destroy();
        header('Location: ' . URLROOT . '/auth/login');
        exit;
    }

    /**
     * Access Routing Helper based on User Permissions Architecture
     */
    private function redirectBasedOnRole(string $role): void {
        if (in_array(strtolower($role), ['admin', 'super_admin'])) {
            header('Location: ' . URLROOT . '/admin');
        } else {
            header('Location: ' . URLROOT . '/user');
        }
        exit;
    }
}