<?php
require_once('data.php');
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

// Check user role (assuming the role is stored in $_SESSION['user_role'])
if (!isset($_SESSION['user_role']) || ($_SESSION['user_role'] !== 'stain_user' && $_SESSION['user_role'] !== 'admin')) {
    if ($_SESSION['user_role'] === 'user') {
        // Redirect users with the role 'user' to index.php
        header("Location: index.php");
        exit();
    } elseif ($_SESSION['user_role'] === 'recorder') {
        // Redirect users with the role 'recorder' to record.php
        header("Location: record.php");
        exit();
    } else {
        // Redirect to an unauthorized page for other roles
        header("Location: login.php"); // Replace with the appropriate page
        exit();
    }
}

// Update the last activity time
$_SESSION['last_activity'] = time();

// Get the logged-in user's ID and first name
$userFirstName = $_SESSION['user_firstname'];
$userPlant = $_SESSION['user_plant'];

// SQL query to retrieve data from the database
$sql = "SELECT * FROM al_safi_dul_stain WHERE plant = ? ORDER BY status ASC, id ASC"; // Modify this query as needed

// Execute the query
$params = array($userPlant);
$result = sqlsrv_query($conn, $sql, $params);

if ($result === false) {
    die(print_r(sqlsrv_errors(), true));
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php include_once('headers.php'); ?>
    <title>Update</title>
</head>

<body class="bg-white text-dark ">
<nav class="navbar navbar-expand-lg navbar-light  bg-light" style="margin-bottom: 2%;">
        <a class="navbar-brand" href="update.php"><img src="images/dulayl.png" alt="Dulayl LOGO" height="30"></a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item active">
                    <a class="nav-link" href="update.php">Home <span class="sr-only">(current)</span></a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="record.php">Record</a>
                </li>
                


            </ul>
            <div class="ml-auto">
                <a class="nav-link" href="logout.php"><button type="button" class="btn btn-outline-danger">Log Out</button></a>
            </div>
        </div>

    </nav>


    <div class="container container_n" style="padding-top:15px;" id="table-container">
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
                while ($row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC)) {
                    if ($row['iscollected'] == 1) {
                        continue;
                    }
                    echo "<tr>";
                    echo "<td class='th_fz'>" . $row['id'] . "</td>";
                    echo "<td class='th_fz'>" . $row['intime']->format('Y-m-d h:i:s A') . "</td>";
                    echo "<td class='th_fz'>" . $row['name'] . "</td>";
                    echo "<td class='th_fz'>" . $row['module'] . "</td>";
                    echo "<td class='th_fz'>" . $row['style'] . "</td>";
                    echo "<td class='th_fz'>" . $row['cw'] . "</td>";
                    echo "<td class='th_fz'>" . $row['quantity'] . "</td>";
                    echo "<td>";
                    if ($row['status'] == 0) {
                        echo '<a class="btn btn-warning th_fz" href="case.php?id=' . $row['id'] . '" onClick="loader(true);" role="button" style="width: 100%;">' ?>
                        <div class="loader" style="color:black">
                            In Progress
                            <div class="loaderBar"></div>
                        </div>
                <?php echo '</a>';
                    } else {
                        echo '<button class="btn btn-success th_fz" disabled style="width: 100%;">Completed</button>';
                    }
                    echo "</td>";
                    // echo "<td><a class='btn btn-primary' href='update.php?id=" . $row['id'] . "'>Update</a></td>";
                    echo "</tr>";
                }


                ?>
            </tbody>
        </table>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/js/bootstrap.bundle.min.js" integrity="sha384-MrcW6ZMFYlzcLA8Nl+NtUVF0sA7MsXsP1UyJoMp4YLEuNSfAP+JcXn/tWtIaxVXM" crossorigin="anonymous"></script>
</body>

<?php include_once('footer.php'); ?>

</html>