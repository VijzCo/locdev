<?php
session_start();
require_once('data.php');
include_once('./DB/conn.php');
include_once('./com/master.php');

// Ensure the user is logged in
if (!isset($_SESSION['user_username'])) {
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

// Update the last activity time
$_SESSION['last_activity'] = time();

// Check user role (assuming the role is stored in $_SESSION['user_role'])
if (!isset($_SESSION['user_role']) || ($_SESSION['user_role'] !== 'user' && $_SESSION['user_role'] !== 'admin' && $_SESSION['user_role'] !== 'superadmin')) {
    header("Location: login.php"); // Redirect to an unauthorized page
    exit();
}

// Get the logged-in user's ID and first name
$userFirstName = $_SESSION['user_firstname'];
$userPlant = $_SESSION['user_plant'];
$userId = $_SESSION['user_id'];

// Check if a record with iscollected NOT equal to 1 already exists for the given conditions and user
$checkQuery = "SELECT COUNT(*) AS count FROM al_safi_dul_stain WHERE userid = ? AND (iscollected IS NULL OR iscollected != 1)";
$checkParams = array($userId);
$checkStmt = sqlsrv_query($conn, $checkQuery, $checkParams);

if ($checkStmt === false) {
    // Handle query error
    $_SESSION['message'] = "err";
    header("Location: addnew.php");
    exit();
}

$checkResult = sqlsrv_fetch_array($checkStmt);
$count = $checkResult['count'];

if ($count > 0) {
    // Record with iscollected NOT equal to 1 already exists, redirect to index.php
    header("Location: index.php");
    exit();
}

// Check if any of the form fields are empty
if (empty($_POST['module']) || empty($_POST['style']) || empty($_POST['cw']) || empty($_POST['qty'])) {
    $er = true;
} else {
    // Get data from the form and apply ucwords and trim
    $module = isset($_POST['module']) ? $_POST['module'] : "";
    $style = isset($_POST['style']) ? strtoupper(str_replace(' ', '', $_POST['style'])) : "";
    $cw = isset($_POST['cw']) ? trim($_POST['cw']) : "";
    $qty = isset($_POST['qty']) ? trim($_POST['qty']) : "";

    // Define the SQL query for insertion
    $sql = "INSERT INTO al_safi_dul_stain (intime, module, style, cw, quantity, effective_date, shift, plant, userid, name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"; // Set iscollected to 1

    $params = array($currentTime, $module, $style, $cw, $qty, $effectiveDate, $shift, $userPlant, $userId, $userFirstName);

    // Prepare and execute the SQL query
    $stmt = sqlsrv_query($conn, $sql, $params);

    if ($stmt === false) {
        $_SESSION['message'] = "err";
    } else {
        // Redirect to index.php after successful form submission
        $_SESSION['message'] = "ok";
        header("Location: index.php");
        exit();
    }
}

?>


<!-- ... (HTML section remains unchanged) -->




<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <?php include_once('headers.php'); ?>
    <title>Add New</title>
</head>

<body class="bg-white text-black ">
    <?php include_once('nav.php'); ?>

    <?php if (!empty($_SESSION['message'])) { ?>
        <div class="container" id="alert_m">
            <?php
            $messageParts = explode(":", $_SESSION['message']);
            $messageType = $messageParts[0];
            $messageText = $messageParts[1];
            ?>
            <div class="alert <?php echo $messageType === 'ok' ? 'alert-success' : 'alert-danger'; ?>" role="alert">
                <?php echo $messageText; ?>
            </div>
            <?php $_SESSION['message'] = ""; ?>
        </div>
    <?php } ?>

    <div class="container container_n">
        <?php
        // Display a greeting with the user's first name if available
        if (isset($userFirstName)) {
            echo "<p>Welcome, $userFirstName!</p>";
        }
        ?>
        <h2 class="text-left mt-5 text-ligt" style="padding-top: 10px; padding-bottom: 2%; font-family:hedfont;">Add New </h2>
        <form method="post" action="addnew.php?submit_data=ok" onsubmit="loader(true);">
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <select class="form-control" id="module" name="module" required>
                            <option selected disabled value="">Select a module</option>
                            <?php foreach ($modules as $mod) {
                                echo '<option value=' . $mod . '>' . $mod . '</option>';
                            } ?>
                        </select>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <input type="text" class="form-control" id="style" placeholder="Style" name="style" required />
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="form-group">
                        <input type="number" class="form-control" id="cw" name="cw" placeholder="Color Way" required />
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="form-group">
                        <input type="number" class="form-control" id="qty" name="qty" placeholder="Quantity" required />
                    </div>
                </div>
                <div class="col-md-4">
                    <button class="btn btn-success my-2 my-sm-0" type="submit" id="submitBtn" style="width: 100%;">Submit</button>
                </div>
            </div>
        </form>
    </div>
</body>

<?php include_once('footer.php'); ?>
<script>
    $(document).ready(function() {
        loader(false);
    });

    document.getElementById("submitBtn").addEventListener("click", function() {
        // Get form data
        var module = document.getElementById("module").value;
        var style = document.getElementById("style").value;
        var cw = document.getElementById("cw").value;
        var qty = document.getElementById("qty").value;

        // Create a new FormData object
        var formData = new FormData();
        formData.append("module", module);
        formData.append("style", style);
        formData.append("cw", cw);
        formData.append("qty", qty);

        // Send a POST request to the server
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "index.php"); // Replace with the correct URL
        xhr.onload = function() {
            if (xhr.status === 200) {
                // Handle the response here, e.g., display a success message
                console.log(xhr.responseText);
                // Reset the form fields
                document.getElementById("module").value = "";
                document.getElementById("style").value = "";
                document.getElementById("cw").value = "";
                document.getElementById("qty").value = "";
            } else {
                // Handle errors or display an error message
                console.error(xhr.responseText);
            }
        };
        xhr.send(formData);
    });

    setTimeout(function() {
        $('#alert_m').fadeOut(1500);
    }, 2000);
</script>

</html>