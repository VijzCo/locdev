<?php
session_start();

// Save the username before destroying the session
//$username = $_SESSION['user_username'];

// Unset all session variables
$_SESSION = array();

// Destroy the session
session_destroy();

// Redirect to the login page
header("Location: login.php");
exit();
?>

