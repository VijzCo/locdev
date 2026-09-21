<?php
include_once('./DB/conn.php');
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $username = $_POST['userid'];
    $password = $_POST['password'];

    $query = "SELECT * FROM al_safi_dul_users WHERE userid = ?";
    $params = array($username);

    $stmt = sqlsrv_query($conn, $query, $params);

    if ($stmt === false) {
        die(print_r(sqlsrv_errors(), true));
    }

    if ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
        // Valid credentials, verify the password using password_verify
        $hashedPassword = $row['password']; // Assuming the column name is 'password'

        if (password_verify($password, $hashedPassword)) {
            // Password is correct, store user information in session
            $_SESSION['user_username'] = $row['username'];
            $_SESSION['user_role'] = $row['userrole'];
            $_SESSION['user_firstname'] = $row['fname'];
            $_SESSION['user_id'] = $row['userid'];
            $_SESSION['user_plant'] = $row['plant'];
            

            // Redirect based on user role
            if ($row['userrole'] == 'user') {
                header('Location: index.php');
                exit();
            } elseif ($row['userrole'] == 'stain_user') {
                header('Location: update.php');
                exit();
            } elseif ($row['userrole'] == 'recorder') {
                header('Location: live.php');
                exit();
            }
            elseif ($row['userrole'] == 'admin') {
                header('Location: create.php');
                exit();
            }
        } else {
            // Invalid credentials, you might want to handle this case accordingly
            $_SESSION['message'] = "Invalid credentials. Please try again.";
        }
    } else {
        // User not found, you might want to handle this case accordingly
        $_SESSION['message'] = "Invalid credentials. Please try again.";
    }

    // Close the statement
    sqlsrv_free_stmt($stmt);
}

// Close the connection
sqlsrv_close($conn);
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php include_once('headers.php'); ?>
    <script>
        function toUpperCase(element) {
            element.value = element.value.toUpperCase();
        }
    </script>
    <title>Login</title>
</head>

<body class="bg-white text-white ">

    <?php include_once('nav.php'); ?>

    <div class="container container_n">
        <h2 class="text-center mt-5 text-dark" style="padding-top: 10px;padding-bottom: 2%;font-family:hedfont">Stain Tracking System</h2>
        <form method="post" onsubmit="loader(true);">
            <div class="mb-4 ">
                <input type="text" class="form-control " placeholder="User ID" id="userid" name="userid" oninput="toUpperCase(this)" required>
            </div>
            <div class="mb-4 ">
                <input type="password" class="form-control" placeholder="Password" id="password" name="password" required>
            </div>
            <div class="mb-4">
                <button type="submit" class="btn btn-success" name="login">Log in</button>
            </div>
        </form>
    </div>
</body>
<?php include_once('footer.php'); ?>

</html>
