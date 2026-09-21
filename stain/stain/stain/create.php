<?php
session_start();
require_once('data.php');
include_once('./DB/conn.php');
include_once('./com/master.php');

// Ensure the user is logged in
if (!isset($_SESSION['user_plant'])) {
    header("Location: login.php");
    exit();
}

// Check the last activity time
$lastActivity = isset($_SESSION['last_activity']) ? $_SESSION['last_activity'] : false;
$timeoutMinutes = 30; // Set the timeout duration in minutes

if ($lastActivity !== false && (time() - $lastActivity > $timeoutMinutes * 60)) {
    // Session has expired, log the user out
    session_unset();
    session_destroy();
    header("Location: login.php");
    exit();
}
// Check user role (assuming the role is stored in $_SESSION['user_role'])
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin' && $_SESSION['user_role'] !== 'recorder') {
    header("Location: login.php"); // Redirect to an unauthorized page
    exit();
}

// Update the last activity time
$_SESSION['last_activity'] = time();

// Get the logged-in user's ID and first name
$userFirstName = $_SESSION['user_firstname'];
$userPlant = $_SESSION['user_plant'];

date_default_timezone_set('Asia/Amman');
$date = date('Y-m-d h:i:s A');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $epf = isset($_POST['epf']) ? $_POST['epf'] : "";
    $fname = isset($_POST['fname']) ? $_POST['fname'] : "";
    $lname = isset($_POST['lname']) ? $_POST['lname'] : "";
    $department = isset($_POST['department']) ? $_POST['department'] : "";
    $designation = isset($_POST['designation']) ? $_POST['designation'] : "";
    $module = isset($_POST['module']) ? $_POST['module'] : "";
    $password = isset($_POST['password']) ? $_POST['password'] : "";
    $selectedRole = isset($_POST['userrole']) ? $_POST['userrole'] : "";

    $epass = password_hash($password, PASSWORD_DEFAULT);


    if (empty($epf) || empty($fname) || empty($lname) || empty($department) || empty($designation) || empty($password) || empty($selectedRole)) {
        $_SESSION['message'] = "err";
    } else {
        $sqlCheckEPF = "SELECT COUNT(*) as count FROM al_safi_dul_users WHERE epf = ?";
        $stmtEPF = sqlsrv_query($conn, $sqlCheckEPF, [$epf]);

        if ($stmtEPF === false) {
            die(print_r(sqlsrv_errors(), true));
        }

        $rowEPF = sqlsrv_fetch_array($stmtEPF, SQLSRV_FETCH_ASSOC);
        $countEPF = $rowEPF['count'];

        if ($countEPF > 0) {
            $_SESSION['message'] = "user_exists";
        } else {
            $userid = $userPlant . $epf;

            $username = strtolower($fname . substr($lname, 0, 1));

            $sqlCheckUsername = "SELECT COUNT(*) as count FROM al_safi_dul_users WHERE username = ?";
            $stmt = sqlsrv_query($conn, $sqlCheckUsername, [$username]);

            if ($stmt === false) {
                die(print_r(sqlsrv_errors(), true));
            }

            $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);
            $count = $row['count'];

            if ($count > 0) {
                $username = strtolower($fname . substr($lname, 0, 2));
            }



            $sql = "INSERT INTO al_safi_dul_users (epf, fname, lname, username, userid, department, designation, module, password, created_at, userrole,plant)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)";

            $params = [$epf, $fname, $lname, $username, $userid, $department, $designation, $module, $epass, $date, $selectedRole, $userPlant];

            $stmt = sqlsrv_query($conn, $sql, $params);

            if ($stmt === false) {
                $_SESSION['message'] = "err";
            } else {
                $_SESSION['message'] = "ok";
            }
        }
    }

    header("Location: create.php");
    exit();
}
?>


<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <?php include_once('headers.php'); ?>
    <style>
        #alert_m {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
            width: 300px;
        }
    </style>
    <title>Create User</title>
</head>

<body class="bg-white text-dark">

    <nav class="navbar navbar-expand-lg navbar-light  bg-light" style="margin-bottom: 2%;">
        <a class="navbar-brand" href="index.php"><img src="images/dulayl.png" alt="Dulayl LOGO" height="30"></a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">

                <li class="nav-item">
                    <a class="nav-link" href="record.php">Record</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="live.php">Live</a>
                </li>



            </ul>
            <div class="ml-auto">
                <a class="nav-link" href="logout.php"><button type="button" class="btn btn-outline-danger">Log Out</button></a>
            </div>
        </div>

    </nav>

    <div id="alert_m">
        <?php
        if (!empty($_SESSION['message'])) {
            $alertClass = "alert-danger"; // Default alert class for errors
            $alertMessage = "An error occurred.";

            if ($_SESSION['message'] === "ok") {
                $alertClass = "alert-success";
                $alertMessage = "User created successfully!";
            } elseif ($_SESSION['message'] === "err") {
                $alertMessage = "User not created!";
            } elseif ($_SESSION['message'] === "user_exists") {
                $alertMessage = "User with this EPF already exists!";
            }

        ?>
            <div class="alert <?php echo $alertClass; ?>" role="alert">
                <?php echo $alertMessage; ?>
            </div>
        <?php
            $_SESSION['message'] = "";
        }
        ?>
    </div>

    <div class="container container_n">
        <?php
        // Display a greeting with the user's first name if available
        if (isset($userFirstName)) {
            echo "<p>Welcome, $userFirstName!</p>";
        }
        ?>

        <h2 class="text-auto mt-4 text-dark " style="padding-top: 10px; padding-bottom: 2%; font-family:hedfont">Create a User</h2>
        <form method="post" action="create.php?submit_data=ok" onsubmit="loader(true);">
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <input type="number" class="form-control" id="epf" placeholder="Enter EPF" name="epf" required />
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <input type="text" class="form-control" id="fname" placeholder="First Name" name="fname" required />
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <input type="text" class="form-control" id="lname" placeholder="Last Name" name="lname" required />
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <select class="form-control" id="department" name="department" required>
                            <option selected disabled value="">Select Department</option>
                            <option value="RMW">RMW</option>
                            <option value="Cutting">Cutting</option>
                            <option value="Sewing">Sewing</option>
                            <option value="FGW">FGW</option>
                            <option value="Quality">Quality</option>
                            <option value="Production">Production</option>
                            <option value="Digtal">Digtal</option>
                            <option value="MOS">MOS</option>

                        </select>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <select class="form-control" id="designation" name="designation" required>
                            <option selected disabled value="">Select Designation</option>
                            <option value="Intern">Intern</option>
                            <option value="Team Member">Team Member</option>
                            <option value="Team Leader">Team Leader</option>
                            <option value="Group Leader">Group Leader</option>
                            <option value="Assistant">Assistant</option>
                            <option value="Excutive">Excutive</option>
                            <option value="Senior Excutive">Senior Excutive</option>
                            <option value="Assistant Manager">Assistant Manager</option>
                            <option value="Manager">Manager</option>
                        </select>
                    </div>
                </div>

                <div class="col-md-4">
                    <div class="form-group">
                        <select class="form-control" id="module" name="module" required disabled>
                            <option selected disabled value="">Select a module</option>
                            <?php foreach ($modules as $module) {
                                echo '<option value=' . $module . '>' . $module . '</option>';
                            } ?>
                        </select>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <select class="form-control" id="userrole" name="userrole" required>
                            <option selected disabled value="">Select Role</option>
                            <option value="user">User</option>
                            <option value="stain_user">Stain User</option>
                            <option value="recorder">Recorder</option>
                        </select>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <input type="password" class="form-control" id="password" placeholder="Password" name="password" required />
                    </div>
                </div>
                <div class="col-md-4">
                    <button class="btn btn-success my-2 my-sm-0" type="submit" id="submitBtn" style="width: 100%;">Create</button>
                </div>


            </div>
        </form>
    </div>

    <!-- ... (rest of your HTML) -->

    <?php include_once('footer.php'); ?>

    <script>
        $(document).ready(function() {
            function showAlertAndFade() {
                $("#alert_m .alert").fadeIn(300).delay(3000).fadeOut(300);
            }
            showAlertAndFade();
        });
    </script>
</body>
<script>
    // Assuming $modules is defined in your data.php file
    const modules = <?php echo json_encode($modules); ?>;

    // Get references to the department and module select elements
    const departmentSelect = document.getElementById('department');
    const moduleSelect = document.getElementById('module');

    // Attach an event listener to the department select element
    departmentSelect.addEventListener('change', function() {
        if (departmentSelect.value === 'Sewing') {
            // If Production department is selected, enable the module dropdown
            moduleSelect.disabled = false;
            // Populate the module dropdown with options from the modules array
            moduleSelect.innerHTML = '<option selected disabled value="">Select a module</option>';
            modules.forEach(module => {
                moduleSelect.innerHTML += `<option value="${module}">${module}</option>`;
            });
        } else {
            // For other departments, disable the module dropdown
            moduleSelect.disabled = true;
        }
    });
</script>


</html>