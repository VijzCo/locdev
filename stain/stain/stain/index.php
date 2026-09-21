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
if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'user' && $_SESSION['user_role'] !== 'admin' ) {
    header("Location: login.php"); // Redirect to an unauthorized page
    exit();
}


// Update the last activity time
$_SESSION['last_activity'] = time();

// Get the logged-in user's ID and first name
$userFirstName = $_SESSION['user_firstname'];
$userPlant = $_SESSION['user_plant'];
$userId = $_SESSION['user_id'];

// Handle the pick-up action
if (isset($_GET['id'])) {
    $id = $_GET['id']; // Get the id parameter from the URL

    // SQL query to update the data for pick-up
    $sql = "UPDATE al_safi_dul_stain SET collected_at = ?, iscollected = '1', collected_by = ? WHERE id = ?";
    $params = array($currentTime, $userFirstName, $id);

    // Execute the update query
    $stmt = sqlsrv_query($conn, $sql, $params);

    if ($stmt === false) {
        $errors = sqlsrv_errors();
        if ($errors != null) {
            foreach ($errors as $error) {
                echo "SQLSTATE: " . $error['SQLSTATE'] . "<br />";
                echo "Code: " . $error['code'] . "<br />";
                echo "Message: " . $error['message'] . "<br />";
            }
        } else {
            echo "Unexpected error occurred.";
        }
        exit(); // Stop execution after encountering an error
    }

    // Redirect back to the same page to refresh the data table
    header("Location: index.php");
    exit();
}

// Modify your SQL query to fetch stain details for the logged-in user
$query = "SELECT al_safi_dul_stain.* FROM al_safi_dul_stain
          INNER JOIN al_safi_dul_users ON al_safi_dul_stain.name = al_safi_dul_users.fname
          WHERE al_safi_dul_users.userid = ? AND (al_safi_dul_stain.iscollected IS NULL OR al_safi_dul_stain.iscollected != 1) ORDER BY id DESC";
$params = array($userId);

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
    <meta http-equiv="refresh" content="300"> <!-- Refresh every 300 seconds (5 minutes) -->
    <?php include_once('headers.php'); ?>
    <title>Homepage</title>
</head>

<body class="bg-white text-black">
    <?php include_once('nav.php'); ?>
    <?php if (!empty($_SESSION['message'])) { ?>
        <div class="container" id="alert_m">
            <?php
            $messageParts = explode(":", $_SESSION['message']);

            // Check if $messageParts has at least two elements
            if (count($messageParts) >= 2) {
                $messageType = $messageParts[0];
                $messageText = $messageParts[1];
            } else {
                // Handle the case where the array doesn't have enough elements
                $messageType = 'error';
                $messageText = 'Unexpected error';
            }
            ?>
            <div class="alert <?php echo $messageType === 'ok' ? 'alert-success' : 'alert-danger'; ?>" role="alert">
                <?php echo $messageText; ?>
            </div>
            <?php $_SESSION['message'] = ""; ?>
        </div>
    <?php } ?>



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
                        echo '<a class="btn btn-success th_fz" style="width: 100%;" href="index.php?id=' . $row['id'] . '" onClick="loader(true);" role="button">Pick</a>';
                    }
                    echo "</td>";
                    echo "</tr>";
                }

                ?>
            </tbody>
        </table>
    </div>
    <!-- Add this script block at the end of your HTML body section in index.php -->
    <script>
        $(document).ready(function() {
            // Check if the message is "collected" and show a popup alert
            <?php if (!empty($_SESSION['message']) && $_SESSION['message'] === 'collected') { ?>
                alert('Please pick pending garments before submitting a new one.');
            <?php } elseif (!empty($_SESSION['message']) && strpos($_SESSION['message'], 'Successfully submitted the record') !== false) { ?>
                alert('Successfully submitted the record.');
            <?php } ?>

            // Fade out the alert after 3 seconds
            setTimeout(function() {
                $('#alert_m').fadeOut(1500);
            }, 3000);
        });
    </script>



</body>
<?php include_once('footer.php'); ?>

</html>