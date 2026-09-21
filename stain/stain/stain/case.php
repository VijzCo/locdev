<?php
include_once('./DB/conn.php');
include_once('./com/master.php');

if (empty($_GET['id'])) {
    header("Location: update.php");
    exit();
}
$id = $_GET['id']; // Get the id parameter from the URL

if (isset($_POST['update'])) {
    $stain_qty = isset($_POST['stain']) ? $_POST['stain'] : null;
    $oil_qty = isset($_POST['oil']) ? $_POST['oil'] : null;

    // Add more fields as needed

    // SQL query to update the data
    $sql = "UPDATE al_safi_dul_stain SET completed_at = ?, status = '1', stain_qty = ?, oil_qty = ? WHERE id = ?";

    $params = array($currentTime, $stain_qty, $oil_qty, $id);

    // Execute the update query
    $stmt = sqlsrv_query($conn, $sql, $params);

    if ($stmt === false) {
        die(print_r(sqlsrv_errors(), true));
    }

    // Redirect back to the data table page
    header("Location: update.php");
    exit();
}

// Retrieve data for the selected item
$sql = "SELECT * FROM al_safi_dul_stain WHERE id = ?";
$params = array($id);
$result = sqlsrv_query($conn, $sql, $params);
if ($result === false) {
    die(print_r(sqlsrv_errors(), true));
}

$data = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php include_once('headers.php'); ?>
    <title>Stain Member</title>
</head>

<body class="bg-white text-white">

    <nav class="navbar navbar-expand-lg navbar-light  bg-light" style="margin-bottom: 2%;">
        <a class="navbar-brand" href="Update.php"><img src="images/dulayl.png" alt="Dulayl LOGO" height="30"></a>
        <button class="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
                <li class="nav-item active">
                    <a class="nav-link" href="update.php">Home <span class="sr-only">(current)</span></a>
                </li>



            </ul>
        </div>
        <div>
            <li class="nav-item">
                <a class="nav-link" href="logout.php"><button type="button" class="btn btn-outline-danger">Log Out</button></a>
            </li>
        </div>
    </nav>

    <div class="container container_n">
        <h2 class="text-left mt-5 text-dark" style="padding-top: 10px;padding-bottom: 2%;font-family:hedfont">Update Data</h2>

        <form method="post" onsubmit="return validateQuantities();">
            <div class="mb-3">
                <input type="number" class="form-control" id="stain" name="stain" placeholder="Stain Quantity" value="<?php echo isset($data['stain']) ? $data['stain'] : ''; ?>" required>
            </div>
            <div class="mb-3">
                <input type="number" class="form-control" id="oil" name="oil" placeholder="Oil Quantity" value="<?php echo isset($data['oil']) ? $data['oil'] : ''; ?>" required>
            </div>
            <!-- Add more form fields for other data as needed -->
            <button type="submit" class="btn btn-success" name="update">Update</button>
        </form>
    </div>

    <script>
        document.addEventListener("DOMContentLoaded", function () {
            // Attach event listeners to input fields
            document.getElementById('stain').addEventListener('input', preventNegativeValues);
            document.getElementById('oil').addEventListener('input', preventNegativeValues);

            function preventNegativeValues(event) {
                // Get the entered value
                var enteredValue = parseFloat(event.target.value) || 0;

                // Check if the value is negative
                if (enteredValue < 0) {
                    // Display a warning message and set the value to 0
                    alert('Please enter a non-negative value.');
                    event.target.value = 0;
                }
            }
        });

        function validateQuantities() {
            // Show loader while validating
            loader(true);

            var stainQty = parseFloat(document.getElementById('stain').value) || 0;
            var oilQty = parseFloat(document.getElementById('oil').value) || 0;
            var totalQty = stainQty + oilQty;
            var dbQty = <?php echo $data['quantity']; ?>; // Assuming 'quantity' is the column name in your database

            if (isNaN(stainQty) || isNaN(oilQty)) {
                loader(false); // Hide loader on validation failure
                alert('Please enter valid non-negative values for stain and oil quantity.');
                return false;
            }

            if (totalQty !== dbQty) {
                loader(false); // Hide loader on validation failure
                alert('Total quantity must be equal to ' + dbQty);
                return false;
            }

            // If everything is valid, you can proceed with the form submission
            return true;
        }
    </script>

</body>

<?php include_once('footer.php'); ?>

</html>