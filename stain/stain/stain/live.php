<?php
include_once('./DB/conn.php');
include_once('./com/master.php');
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
        header("Location: logina.php"); // Replace with the appropriate page
        exit();
    }
}

// Update the last activity time
$_SESSION['last_activity'] = time();

// Get the logged-in user's ID and first name
$userFirstName = $_SESSION['user_firstname'];
$userPlant = $_SESSION['user_plant'];


// Modify your SQL query to fetch stain details for the logged-in user
$query = "SELECT * FROM al_safi_dul_stain WHERE plant = ? ORDER BY id";
$params = array($userPlant);


$stmt = sqlsrv_query($conn, $query, $params);

if ($stmt === false) {
    die(print_r(sqlsrv_errors(), true));
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php include_once('headers.php'); ?>
    <meta http-equiv="refresh" content="300"> <!-- Refresh every 300 seconds (5 minutes) -->
    <title>Live</title>
</head>

<body class="bg-white text-black">
    <?php include_once('nav.php'); ?>



    <div class="container container_n" style="padding-top: 15px;" id="table-container">
        <?php
        // Display a greeting with the user's first name if available
        if (isset($userFirstName)) {
            echo "<p>Welcome, $userFirstName!</p>";
        }
        ?>

        <table class="table text-dark table-striped table-bordered">
            <thead class="thead-dark">
                <tr>
                    <th class="th_fz">Job ID</th>
                    <th class="th_fz">In Time</th>
                    <th class="th_fz">TL Name</th>
                    <th class="th_fz">Module</th>
                    <th class="th_fz">Style</th>
                    <th class="th_fz">Color Way</th>
                    <th class="th_fz">Quantity</th>
                    <th class="th_fz">Status</th>
                </tr>
            </thead>
            <tbody>
                <?php


                // Fetch and display data in the table
                while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {

                    if ($row['iscollected'] == 1) {
                        continue;
                    }

                    echo "<tr";
                    $completionTime = isset($row['completed_at']) && $row['completed_at'] !== null
                        ? $row['completed_at']->format('Y-m-d h:i:s A')
                        : null;

                    // Check if completionTime is not null before using it
                    if ($completionTime !== null) {
                        $timeDifference = strtotime($currentTime) - strtotime($completionTime);

                        if ($timeDifference > 900) { // 900 seconds = 15 minutes
                            echo " style='background-color: #FF9983;'"; // Red background
                        }
                    }


                    echo ">";

                    echo "<td class='th_fz'>" . $row['id'] . "</td>";
                    echo "<td class='th_fz'>" . $row['intime']->format('Y-m-d h:i A') . "</td>";
                    echo "<td class='th_fz'>" . $row['name'] . "</td>";
                    echo "<td class='th_fz'>" . $row['module'] . "</td>";
                    echo "<td class='th_fz'>" . $row['style'] . "</td>";
                    echo "<td class='th_fz'>" . $row['cw'] . "</td>";
                    echo "<td class='th_fz'>" . $row['quantity'] . "</td>";
                    echo "<td>";
                    if ($row['status'] == 0) {
                        echo '<button class="btn btn-warning th_fz" style="width: 100%;" disabled>
                                <div class="loader" style="color: black">In Progress
                                    <div class="loaderBar"></div>
                                </div>
                              </button>';
                    } else {
                        echo '<button class="btn btn-success th_fz" style="width: 100%;" Disabled>';
                        echo 'Ready';
                        echo '</button>';
                    }
                    echo "</td>";
                    echo "</tr>";
                }

                ?>
            </tbody>
        </table>
    </div>
</body>
<?php include_once('footer.php'); ?>

</html>