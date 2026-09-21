<?php
// Check for error parameter
if (isset($_GET['error'])) {
    $errorMessage = '';

    switch ($_GET['error']) {
        case 'invalid_credentials':
            $errorMessage = 'Invalid credentials. Please check your username and password.';
            break;

        case 'user_not_found':
            $errorMessage = 'User not found. Please check your username.';
            break;

        // Add more cases as needed

        default:
            $errorMessage = 'An error occurred.';
            break;
    }

    echo "<script>
            $(document).ready(function() {
                $('#errorAlert').html('{$errorMessage}');
                $('#errorAlert').fadeIn(300).delay(3000).fadeOut(300);
            });
        </script>";
}
?>
