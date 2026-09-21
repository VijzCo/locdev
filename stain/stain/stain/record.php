<?php
include_once('./DB/conn.php');
session_start();

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

// Get the logged-in user's role
$userRole = $_SESSION['user_role'];
$userPlant = $_SESSION['user_plant'];
$userFirstName = $_SESSION['user_firstname'];

// Check user role (assuming the role is stored in $_SESSION['user_role'])
if (!isset($_SESSION['user_role']) || ($_SESSION['user_role'] !== 'recorder' && $_SESSION['user_role'] !== 'admin')) {
    if ($_SESSION['user_role'] === 'user') {
        // Redirect users with the role 'user' to index.php
        header("Location: index.php");
        exit();
    } elseif ($_SESSION['user_role'] === 'stain_user') {
        // Redirect users with the role 'recorder' to record.php
        header("Location: update.php");
        exit();
    } else {
        // Redirect to an unauthorized page for other roles
        header("Location: login.php"); // Replace with the appropriate page
        exit();
    }
}





// Initialize the date variables
$start_date = "";
$end_date = "";

if (isset($_POST['submit'])) {
    $start_date = $_POST['start_date'];
    $end_date = $_POST['end_date'];

    // Validate and sanitize the input
    $start_date = date("Y-m-d", strtotime($start_date));
    $end_date = date("Y-m-d", strtotime($end_date));

    // SQL query to retrieve data from the database within the selected date range
    $sql = "SELECT * FROM al_safi_dul_stain WHERE intime BETWEEN '$start_date 00:00:00' AND '$end_date 23:59:59' AND plant = ? ORDER BY id";


    // Execute the query
    $params = array($userPlant);
    // Execute the query
    $result = sqlsrv_query($conn, $sql, $params);

    if ($result === false) {
        die(print_r(sqlsrv_errors(), true));
    }
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php include_once('headers.php'); ?>
    <title>Record</title>
    <meta http-equiv="refresh" content="100">
</head>

<body class="bg-light text-dark">
    <nav class="navbar navbar-expand-lg navbar-light  bg-light " style="margin-bottom: 2%;">
        <a class="navbar-brand" href="index.php"><img src="images/dulayl.png" alt="Dulayl LOGO" height="30"></a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item active">
                    <a class="nav-link" href="record.php">Home <span class="sr-only">(current)</span></a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="record.php">Record</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="live.php">Live</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="create.php">Create User</a>
                </li>

                
            </ul>
        </div>
        <div class="ml-auto">
            <a class="nav-link" href="logout.php"><button type="button" class="btn btn-outline-danger">Log Out</button></a>
        </div>
    </nav>

    <div class="container container_n" style="padding-top: 15px;">
        <?php
        // Display a greeting with the user's first name if available
        if (isset($userFirstName)) {
            echo "<p>Welcome, $userFirstName!</p>";
        }
        ?>
        <form method="POST" action="" class="date-filter-form">
            <div class="form-group row">
                <label for="start_date" class="col-form-label col-md-1 ">Start Date:</label>
                <div class="col-md-2">
                    <input type="date" name="start_date" id="start_date" class="form-control bg-secondary text-light" required value="<?php echo $start_date; ?>">
                </div>
                <label for="end_date" class="col-form-label col-md-1">End Date:</label>
                <div class="col-md-2">
                    <input type="date" name="end_date" id="end_date" class="form-control bg-secondary text-light" required value="<?php echo $end_date; ?>">
                </div>
                <div class="col-md-2">
                    <div class="col-md-4 offset-md-2">
                        <button type="submit" class="btn btn-info th_fz" name="submit">Search</button>

                    </div>
                    <!-- <div class="col-md-2">
                        <button type="submit" class="btn btn-success th_fz" name="generate_excel">Generate Excel Report</button>
                    </div> -->
                </div>

            </div>

        </form>

        <br>

        <table class="table text-dark table-striped table-bordered ">
            <thead class="thead-dark">
                <tr>
                    <th class="th_fz">Job ID</th>
                    <th class="th_fz">In Time</th>
                    <th class="th_fz">TL Name</th>
                    <th class="th_fz">Module</th>
                    <th class="th_fz">Style</th>
                    <th class="th_fz">Color Way</th>
                    <th class="th_fz">Stain Qty</th>
                    <th class="th_fz">Oil Qty</th>
                    <th class="th_fz">Total</th>
                    <th class="th_fz">Status</th>
                </tr>
            </thead>
            <tbody>
                <?php
                if (isset($result)) {
                    while ($row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC)) {
                        echo "<tr>";
                        echo "<td class='th_fz'>" . $row['id'] . "</td>";
                        echo "<td class='th_fz'>" . $row['intime']->format('Y-m-d h:i A') . "</td>";
                        echo "<td class='th_fz'>" . $row['name'] . "</td>";
                        echo "<td class='th_fz'>" . $row['module'] . "</td>";
                        echo "<td class='th_fz'>" . $row['style'] . "</td>";
                        echo "<td class='th_fz'>" . $row['cw'] . "</td>";
                        echo "<td class='th_fz'>" . $row['stain_qty'] . "</td>";
                        echo "<td class='th_fz'>" . $row['oil_qty'] . "</td>";
                        echo "<td class='th_fz'>" . $row['quantity'] . "</td>";
                        echo "<td>";
                        if ($row['status'] == 0 && $row['iscollected'] == 0) {
                            echo '<span class="badge badge-warning th_fz" style="width: 100%;">';
                            echo '<div class="loader" style="color:black">';
                            echo 'In Progress';
                            echo '<div class="loaderBar"></div>';
                            echo '</div>';
                            echo '</span>';
                        } elseif ($row['status'] == 1 && $row['iscollected'] == 0) {
                            echo '<span class="badge badge-success th_fz" style="width: 100%;" Disabled>';
                            echo '<div class="loader" style="color:black">';
                            echo 'Ready';
                            echo '<div class="loaderBar"></div>';
                            echo '</div>';
                            echo '</span>';
                        } elseif ($row['status'] == 1 && $row['iscollected'] == 1) {
                            echo '<button class="btn btn-secondary th_fz" style="width: 100%;" Disabled>';
                            echo 'Picked';
                            echo '</button>';
                        } else {
                            echo '<a class="btn btn-success th_fz" style="width: 100%;" href="collect.php?id=' . $row['id'] . '" onClick="loader(true);" role="button">Pick</a>';
                        }
                        echo "</td>";
                        echo "</tr>";
                    }
                }
                ?>
            </tbody>
        </table>
    </div>
</body>
<?php include_once('footer.php'); ?>

</html>